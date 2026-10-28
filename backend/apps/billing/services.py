from decimal import Decimal

from django.db import transaction

from apps.core.models import ActivityLog
from .models import ZERO, Invoice, InvoiceLine, Payment, Quote, QuoteLine, money

LINE_FIELDS = ['position', 'line_type', 'part_id', 'reference', 'designation', 'operation',
               'quantity', 'unit_price', 'discount_pct', 'vat_rate', 'comment']


def _copy_lines(source_lines, model, **fk):
    model.objects.bulk_create([model(**fk, **{f: getattr(l, f) for f in LINE_FIELDS}) for l in source_lines])


@transaction.atomic
def revise_quote(quote):
    """New version of a quote; the original is kept untouched for history."""
    latest = Quote.objects.filter(company_id=quote.company_id, number=quote.number).order_by('-version').first()
    new = Quote.objects.create(
        company_id=quote.company_id,
        number=quote.number, version=latest.version + 1, previous=quote,
        repair_order=quote.repair_order, kind=quote.kind, notes=quote.notes,
        valid_until=quote.valid_until,
    )
    _copy_lines(quote.lines.all(), QuoteLine, quote=new)
    new.refresh_cache()
    ActivityLog.record('quote', new, 'revised', f'Devis {new.number} révisé en v{new.version}',
                       client_id=quote.repair_order.client_id, repair_order_id=quote.repair_order_id)
    return new


@transaction.atomic
def invoice_from_quote(quote, insurance_amount=None):
    ro = quote.repair_order
    invoice = Invoice.objects.create(company_id=ro.company_id, repair_order=ro, quote=quote, notes=quote.notes)
    _copy_lines(quote.lines.all(), InvoiceLine, invoice=invoice)
    if insurance_amount is None and ro.is_insurance:
        insurance_amount = max(money(ro.insurance_approved_amount) - money(ro.deductible), ZERO)
    invoice.insurance_amount = money(insurance_amount)
    invoice.save()
    invoice.refresh_status()
    ActivityLog.record('invoice', invoice, 'created', f'Facture {invoice.number} créée depuis le devis {quote.number}',
                       client_id=ro.client_id, repair_order_id=ro.pk)
    return invoice


def repair_order_finance(ro):
    """Financial summary of a repair order. Every payment is counted once, only if really received."""
    quotes = list(ro.quotes.prefetch_related('lines'))
    approved = [q for q in quotes if q.status == 'accepted']
    approved_ttc = sum((q.compute_totals()['total_ttc'] for q in approved), ZERO)
    invoices = [i for i in ro.invoices.prefetch_related('lines') if i.status not in ('draft', 'cancelled')]
    invoiced_ttc = sum((i.compute_totals()['total_ttc'] for i in invoices), ZERO)
    insurance_share = sum((money(i.insurance_amount) for i in invoices), ZERO)
    client_share = invoiced_ttc - insurance_share

    payments = list(ro.payments.all())
    received = sum((p.counted_amount for p in payments), ZERO)
    deposits = sum((p.counted_amount for p in payments if p.kind == 'deposit'), ZERO)
    pending_cheques = sum((money(p.amount) for p in payments if p.is_pending), ZERO)
    paid_insurance = sum((p.counted_amount for p in payments if p.origin == 'insurance'), ZERO)
    paid_client = sum((p.counted_amount for p in payments if p.origin == 'client'), ZERO)

    parts_cost = ZERO
    for m in ro.stock_movements.all():
        if m.kind in ('out', 'unused_return'):
            parts_cost += -Decimal(m.signed_quantity) * money(m.unit_cost)
    labor_cost = sum((money(t.hours_spent) * money(t.employee.hourly_cost if t.employee else 0)
                      for t in ro.tasks.select_related('employee')), ZERO)
    invoiced_ht = sum((i.compute_totals()['total_ht'] for i in invoices), ZERO)
    reference_ht = invoiced_ht or sum((q.compute_totals()['total_ht'] for q in approved), ZERO)

    return {
        'approved_ttc': approved_ttc,
        'invoiced_ttc': invoiced_ttc,
        'received': received,
        'deposits': deposits,
        'pending_cheques': pending_cheques,
        'balance': invoiced_ttc - received,
        'insurance_share': insurance_share,
        'insurance_paid': paid_insurance,
        'insurance_balance': insurance_share - paid_insurance,
        'client_share': client_share,
        'client_paid': paid_client,
        'client_balance': client_share - paid_client,
        'parts_cost': money(parts_cost),
        'labor_cost': money(labor_cost),
        'estimated_cost': money(ro.estimated_cost),
        'margin': money(reference_ht - parts_cost - labor_cost),
    }


def client_finance(client):
    invoices = Invoice.objects.filter(repair_order__client=client).exclude(status__in=['draft', 'cancelled'])
    invoiced = sum((money(i.total_ttc_cache) for i in invoices), ZERO)
    paid = sum((p.counted_amount for p in Payment.objects.filter(client=client)), ZERO)
    return {'invoiced': invoiced, 'paid': paid, 'balance': invoiced - paid}
