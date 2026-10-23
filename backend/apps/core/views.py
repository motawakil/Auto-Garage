import csv
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.billing.models import Invoice, Payment, Quote, ZERO
from apps.clients.models import Client, Vehicle
from apps.inventory.models import Part
from apps.repairs.models import RepairOrder, RepairTask
from .models import ActivityLog, Document, GarageSettings
from .serializers import DocumentSerializer, GarageSettingsSerializer

ACTIVE = ~Q(status__in=['done', 'delivered', 'closed'])
UNPAID = ['issued', 'partial', 'overdue', 'disputed']


@api_view(['GET', 'PUT', 'PATCH'])
def garage_settings(request):
    obj = GarageSettings.load()
    if request.method == 'GET':
        return Response(GarageSettingsSerializer(obj).data)
    ser = GarageSettingsSerializer(obj, data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data)


def _received(qs):
    return sum((p.counted_amount for p in qs), ZERO)


@api_view(['GET'])
def dashboard(request):
    today = timezone.localdate()
    month_start = today.replace(day=1)
    ro = RepairOrder.objects
    invoices = Invoice.objects.exclude(status__in=['draft', 'cancelled'])
    payments = Payment.objects.filter(is_cancelled=False)

    # Six-month revenue: invoiced vs actually collected.
    since = (month_start - timedelta(days=160)).replace(day=1)
    invoiced_by_month = dict(invoices.filter(date__gte=since).annotate(m=TruncMonth('date'))
                             .values('m').annotate(t=Sum('total_ttc_cache')).values_list('m', 't'))
    collected_by_month = {}
    for p in payments.filter(date__gte=since):
        key = p.date.replace(day=1)
        collected_by_month[key] = collected_by_month.get(key, ZERO) + p.counted_amount
    months, cursor = [], since
    while cursor <= month_start:
        months.append({'month': cursor.isoformat(), 'invoiced': float(invoiced_by_month.get(cursor) or 0),
                       'collected': float(collected_by_month.get(cursor) or 0)})
        cursor = (cursor + timedelta(days=32)).replace(day=1)

    unpaid = invoices.filter(status__in=UNPAID)
    pending_cheques = payments.filter(method='cheque', cheque_status__in=['received', 'pending'])
    month_payments = payments.filter(date__gte=month_start)

    by_status = dict(ro.filter(ACTIVE).values_list('status').annotate(c=Count('id')))
    by_type = list(ro.filter(entry_date__gte=since).values('repair_type').annotate(c=Count('id')).order_by('-c'))
    labels = dict(RepairOrder.TYPE_CHOICES)

    recent = ro.select_related('client', 'vehicle').order_by('-updated_at')[:8]
    return Response({
        'counts': {
            'clients': Client.objects.count(),
            'vehicles': Vehicle.objects.count(),
            'active_repairs': ro.filter(ACTIVE).count(),
            'waiting_expertise': ro.filter(status='waiting_expertise').count(),
            'done_repairs': ro.filter(status__in=['done', 'delivered', 'closed']).count(),
            'ready_to_deliver': ro.filter(status='done').count(),
            'quotes_pending': Quote.objects.filter(status__in=['sent', 'pending']).count(),
            'late_tasks': RepairTask.objects.exclude(status='done').filter(due_date__lt=today).count(),
            'low_stock': Part.objects.filter(quantity__lte=F('min_quantity')).count(),
        },
        'finance': {
            'month_invoiced': float(invoices.filter(date__gte=month_start).aggregate(t=Sum('total_ttc_cache'))['t'] or 0),
            'month_collected': float(_received(month_payments)),
            'unpaid_count': unpaid.count(),
            'unpaid_amount': float(sum((i.total_ttc_cache - i.paid_cache for i in unpaid), ZERO)),
            'pending_cheques_count': pending_cheques.count(),
            'pending_cheques_amount': float(pending_cheques.aggregate(t=Sum('amount'))['t'] or 0),
            'insurance_receivable': float(sum((max(i.insurance_amount - _received(i.payments.filter(origin='insurance')), ZERO)
                                               for i in unpaid), ZERO)),
        },
        'revenue': months,
        'pipeline': [{'status': v, 'label': l, 'count': by_status.get(v, 0)}
                     for v, l in RepairOrder.STATUS_CHOICES if v not in ('done', 'delivered', 'closed')],
        'by_type': [{'type': r['repair_type'], 'label': labels[r['repair_type']], 'count': r['c']} for r in by_type],
        'recent': [{'id': r.id, 'number': r.number, 'client': r.client.display_name, 'vehicle': str(r.vehicle),
                    'status': r.status, 'status_label': r.get_status_display(), 'updated_at': r.updated_at,
                    'expected_delivery_date': r.expected_delivery_date} for r in recent],
        'activity': [{'id': a.id, 'date': a.created_at, 'message': a.message, 'entity': a.entity,
                      'entity_id': a.entity_id, 'repair_order_id': a.repair_order_id}
                     for a in ActivityLog.objects.all()[:8]],
    })


@api_view(['GET'])
def notifications(request):
    """Live alerts derived from the data: they stay until the underlying issue is resolved."""
    today = timezone.localdate()
    items = []

    def add(kind, priority, title, detail, link, date=None):
        items.append({'id': f'{kind}-{len(items)}', 'kind': kind, 'priority': priority, 'title': title,
                      'detail': detail, 'link': link, 'date': date})

    for t in RepairTask.objects.exclude(status='done').filter(due_date__lt=today).select_related('repair_order', 'employee'):
        add('task_late', 'high', f'Tâche en retard : {t.title}',
            f'{t.repair_order.number} · {t.employee.full_name if t.employee else "non assignée"} · échéance {t.due_date:%d/%m}',
            f'/dossiers/{t.repair_order_id}', t.due_date)
    for r in RepairOrder.objects.filter(status='waiting_expertise').select_related('vehicle'):
        add('expertise', 'normal', f'Expertise à programmer — {r.number}', str(r.vehicle), f'/dossiers/{r.id}', r.entry_date)
    for r in RepairOrder.objects.filter(status='waiting_documents').select_related('vehicle'):
        add('documents', 'normal', f'Documents manquants — {r.number}', str(r.vehicle), f'/dossiers/{r.id}', r.entry_date)
    for r in RepairOrder.objects.filter(status='waiting_parts').select_related('vehicle'):
        add('parts', 'normal', f'Pièces non reçues — {r.number}', str(r.vehicle), f'/dossiers/{r.id}', r.entry_date)
    for r in RepairOrder.objects.filter(status='done').select_related('vehicle', 'client'):
        add('ready', 'low', f'Véhicule prêt à livrer — {r.vehicle.plate}', f'{r.client.display_name} · {r.number}',
            f'/dossiers/{r.id}', r.updated_at.date())
    for r in RepairOrder.objects.filter(ACTIVE, expected_delivery_date__lt=today).select_related('vehicle'):
        add('repair_late', 'high', f'Livraison dépassée — {r.number}', f'{r.vehicle} · prévue le {r.expected_delivery_date:%d/%m}',
            f'/dossiers/{r.id}', r.expected_delivery_date)
    for q in Quote.objects.filter(status__in=['sent', 'pending']).select_related('repair_order'):
        add('quote', 'normal', f'Devis en attente de validation — {q.number}', q.repair_order.number, f'/devis/{q.id}', q.date)
    for i in Invoice.objects.filter(status__in=['overdue', 'disputed']).select_related('repair_order__client'):
        add('invoice', 'high', f'Facture impayée — {i.number}',
            f'{i.repair_order.client.display_name} · reste {i.total_ttc_cache - i.paid_cache:.2f} MAD', f'/factures/{i.id}', i.due_date)
    for p in Payment.objects.filter(method='cheque', cheque_status__in=['received', 'pending'], is_cancelled=False,
                                    cheque_due_date__lte=today + timedelta(days=7)).select_related('client'):
        add('cheque', 'high' if p.cheque_due_date <= today else 'normal', f'Échéance de chèque — {p.amount} MAD',
            f'{p.client.display_name} · {p.bank or "banque ?"} · {p.cheque_due_date:%d/%m}', '/paiements', p.cheque_due_date)
    for i in Invoice.objects.filter(status__in=UNPAID, insurance_amount__gt=0).select_related('repair_order__insurance_company'):
        paid = _received(i.payments.filter(origin='insurance'))
        if paid < i.insurance_amount:
            company = i.repair_order.insurance_company.name if i.repair_order.insurance_company else 'Assurance'
            add('insurance', 'normal', f'Paiement assurance en attente — {i.number}',
                f'{company} · {i.insurance_amount - paid:.2f} MAD', f'/factures/{i.id}', i.date)
    for p in Part.objects.filter(quantity__lte=F('min_quantity')):
        add('stock', 'high' if p.quantity <= 0 else 'normal', f'Stock bas : {p.designation}',
            f'{p.reference} · {p.quantity} en stock (min {p.min_quantity})', '/stock', None)

    order = {'high': 0, 'normal': 1, 'low': 2}
    items.sort(key=lambda n: (order[n['priority']], str(n['date'] or '')))
    return Response(items)


@api_view(['GET'])
def global_search(request):
    q = request.query_params.get('q', '').strip()
    if len(q) < 2:
        return Response([])
    out = []
    for c in Client.objects.filter(Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(company_name__icontains=q)
                                   | Q(phone__icontains=q) | Q(cin__icontains=q))[:5]:
        out.append({'type': 'client', 'id': c.id, 'title': c.display_name, 'subtitle': f'{c.code} · {c.phone}', 'link': f'/clients/{c.id}'})
    for v in Vehicle.objects.filter(Q(plate__icontains=q) | Q(vin__icontains=q) | Q(model__icontains=q)).select_related('client')[:5]:
        out.append({'type': 'vehicle', 'id': v.id, 'title': v.plate, 'subtitle': f'{v.brand} {v.model} · {v.client.display_name}',
                    'link': f'/clients/{v.client_id}?tab=vehicles'})
    for r in RepairOrder.objects.filter(Q(number__icontains=q) | Q(claim_number__icontains=q)).select_related('vehicle')[:5]:
        out.append({'type': 'repair', 'id': r.id, 'title': r.number, 'subtitle': f'{r.vehicle} · {r.get_status_display()}', 'link': f'/dossiers/{r.id}'})
    for i in Invoice.objects.filter(number__icontains=q)[:3]:
        out.append({'type': 'invoice', 'id': i.id, 'title': i.number, 'subtitle': f'Facture · {i.get_status_display()}', 'link': f'/factures/{i.id}'})
    for d in Quote.objects.filter(number__icontains=q)[:3]:
        out.append({'type': 'quote', 'id': d.id, 'title': f'{d.number} v{d.version}', 'subtitle': f'Devis · {d.get_status_display()}', 'link': f'/devis/{d.id}'})
    for p in Part.objects.filter(Q(reference__icontains=q) | Q(oem_reference__icontains=q) | Q(designation__icontains=q))[:4]:
        out.append({'type': 'part', 'id': p.id, 'title': p.designation, 'subtitle': f'{p.reference} · {p.quantity} en stock', 'link': '/stock'})
    return Response(out)


@api_view(['GET'])
def reports(request):
    """Profitability by period and service type, distinguishing invoiced, collected and receivable."""
    date_from = request.query_params.get('from') or timezone.localdate().replace(month=1, day=1).isoformat()
    date_to = request.query_params.get('to') or timezone.localdate().isoformat()
    invoices = Invoice.objects.exclude(status__in=['draft', 'cancelled']).filter(date__range=[date_from, date_to]).prefetch_related('lines')
    payments = Payment.objects.filter(date__range=[date_from, date_to])
    from apps.billing.services import repair_order_finance
    by_type = {}
    for ro in RepairOrder.objects.filter(invoices__in=invoices).distinct().prefetch_related('tasks', 'stock_movements'):
        f = repair_order_finance(ro)
        row = by_type.setdefault(ro.get_repair_type_display(), {'label': ro.get_repair_type_display(), 'count': 0,
                                                               'invoiced': ZERO, 'costs': ZERO, 'margin': ZERO})
        row['count'] += 1
        row['invoiced'] += f['invoiced_ttc']
        row['costs'] += f['parts_cost'] + f['labor_cost']
        row['margin'] += f['margin']
    totals = [i.compute_totals() for i in invoices]
    return Response({
        'from': date_from, 'to': date_to,
        'invoiced_ttc': sum((t['total_ttc'] for t in totals), ZERO),
        'invoiced_ht': sum((t['total_ht'] for t in totals), ZERO),
        'vat_collected': sum((t['total_vat'] for t in totals), ZERO),
        'collected': _received(payments),
        'pending_cheques': sum((p.amount for p in payments if p.is_pending), ZERO),
        'receivable': sum((i.total_ttc_cache - i.paid_cache for i in invoices if i.status in UNPAID), ZERO),
        'by_type': list(by_type.values()),
    })


EXPORTS = {
    'clients': (lambda: Client.objects.all(), ['code', 'display_name', 'phone', 'email', 'city', 'cin', 'ice']),
    'vehicles': (lambda: Vehicle.objects.select_related('client'), ['plate', 'brand', 'model', 'year', 'engine', 'vin', 'mileage', 'client']),
    'dossiers': (lambda: RepairOrder.objects.select_related('client', 'vehicle'),
                 ['number', 'entry_date', 'client', 'vehicle', 'get_repair_type_display', 'get_status_display', 'estimated_cost']),
    'factures': (lambda: Invoice.objects.select_related('repair_order__client'),
                 ['number', 'date', 'due_date', 'repair_order', 'get_status_display', 'total_ttc_cache', 'insurance_amount', 'paid_cache']),
    'paiements': (lambda: Payment.objects.select_related('client', 'repair_order', 'invoice'),
                  ['number', 'date', 'client', 'repair_order', 'invoice', 'get_kind_display', 'get_method_display',
                   'get_origin_display', 'amount', 'reference', 'bank', 'get_cheque_status_display', 'is_received']),
    'stock': (lambda: Part.objects.select_related('supplier'),
              ['reference', 'oem_reference', 'designation', 'get_category_display', 'brand', 'quantity', 'min_quantity',
               'purchase_price', 'sale_price', 'location', 'supplier']),
}


def export_csv(request, name):
    """Excel-compatible CSV (UTF-8 BOM, semicolon separator)."""
    qs_fn, fields = EXPORTS[name]
    resp = HttpResponse(content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="{name}-{timezone.localdate():%Y%m%d}.csv"'
    resp.write('﻿')
    w = csv.writer(resp, delimiter=';')
    w.writerow([f.replace('get_', '').replace('_display', '') for f in fields])
    for obj in qs_fn():
        row = []
        for f in fields:
            v = getattr(obj, f)
            v = v() if callable(v) else v
            row.append(str(v).replace('.', ',') if isinstance(v, Decimal) else ('' if v is None else str(v)))
        w.writerow(row)
    return resp


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    queryset = Document.objects.select_related('client', 'vehicle', 'repair_order')
    filterset_fields = ['client', 'vehicle', 'repair_order', 'kind']
    search_fields = ['title', 'notes', 'repair_order__number', 'client__last_name']
