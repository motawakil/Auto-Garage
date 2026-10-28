from decimal import Decimal

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.tenancy import CompanyScopedViewMixin
from apps.core.models import ActivityLog
from .models import Invoice, Payment, Quote
from .serializers import InvoiceSerializer, PaymentSerializer, QuoteSerializer
from .services import invoice_from_quote, revise_quote


class QuoteViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = QuoteSerializer
    filterset_fields = ['status', 'kind', 'repair_order', 'repair_order__client']
    search_fields = ['number', 'repair_order__number', 'repair_order__client__last_name',
                     'repair_order__client__company_name', 'repair_order__vehicle__plate']
    ordering_fields = ['date', 'number', 'total_ttc_cache']

    def get_queryset(self):
        qs = Quote.objects.select_related('repair_order__client', 'repair_order__vehicle').prefetch_related('lines')
        if self.request.query_params.get('latest') == '1':
            # Only the latest version of each quote number in list views.
            from django.db.models import Max, OuterRef, Subquery
            latest = (Quote.objects.filter(company=OuterRef('company'), number=OuterRef('number'))
                      .order_by('-version').values('version')[:1])
            qs = qs.filter(version=Subquery(latest))
        return qs

    def perform_destroy(self, instance):
        if instance.is_locked or instance.invoices.exists():
            raise ValidationError('Un devis validé ou facturé ne peut pas être supprimé.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def revise(self, request, pk=None):
        new = revise_quote(self.get_object())
        return Response(QuoteSerializer(new).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='to-invoice')
    def to_invoice(self, request, pk=None):
        quote = self.get_object()
        if quote.status != 'accepted':
            raise ValidationError('Seul un devis accepté peut être facturé.')
        amount = request.data.get('insurance_amount')
        invoice = invoice_from_quote(quote, Decimal(str(amount)) if amount not in (None, '') else None)
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InvoiceViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    filterset_fields = ['status', 'repair_order', 'repair_order__client']
    search_fields = ['number', 'repair_order__number', 'repair_order__client__last_name',
                     'repair_order__client__company_name', 'repair_order__vehicle__plate']
    ordering_fields = ['date', 'number', 'total_ttc_cache', 'due_date']

    def get_queryset(self):
        qs = Invoice.objects.select_related('repair_order__client', 'repair_order__vehicle', 'quote').prefetch_related('lines')
        if self.request.query_params.get('unpaid') == '1':
            qs = qs.filter(status__in=['issued', 'partial', 'overdue', 'disputed'])
        return qs

    def list(self, request, *args, **kwargs):
        for inv in Invoice.objects.filter(company=request.company, status__in=['issued', 'partial', 'overdue']):
            inv.refresh_status()
        return super().list(request, *args, **kwargs)

    def perform_destroy(self, instance):
        if instance.is_locked:
            raise ValidationError('Une facture émise ne peut pas être supprimée : annulez-la avec un motif.')
        instance.delete()


class PaymentViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    filterset_fields = ['client', 'repair_order', 'invoice', 'method', 'origin', 'kind', 'cheque_status', 'is_cancelled']
    search_fields = ['reference', 'bank', 'client__last_name', 'client__company_name', 'repair_order__number', 'invoice__number']
    ordering_fields = ['date', 'amount']

    def get_queryset(self):
        return Payment.objects.select_related('client', 'repair_order', 'invoice')

    def _sync(self, payment, action, message):
        if payment.invoice_id:
            payment.invoice.refresh_status()
        ActivityLog.record('payment', payment, action, message, client_id=payment.client_id,
                           repair_order_id=payment.repair_order_id)

    def perform_create(self, serializer):
        p = serializer.save()
        self._sync(p, 'created', f'{p.get_kind_display()} {p.amount} MAD ({p.get_method_display()}) enregistré')

    def perform_update(self, serializer):
        p = serializer.save()
        self._sync(p, 'updated', f'Paiement {p.number} modifié'
                   + (f' — chèque {p.get_cheque_status_display().lower()}' if p.method == 'cheque' else ''))

    @action(detail=True, url_path='receipt')
    def receipt_file(self, request, pk=None):
        from apps.core.views import serve_file
        return serve_file(self.get_object().receipt)

    def perform_destroy(self, instance):
        raise ValidationError('Les paiements ne se suppriment pas : annulez-les ou enregistrez un remboursement.')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        p = self.get_object()
        reason = request.data.get('reason', '').strip()
        if not reason:
            raise ValidationError({'reason': "Le motif d'annulation est obligatoire."})
        p.is_cancelled = True
        p.reason = reason
        p.save(update_fields=['is_cancelled', 'reason', 'updated_at'])
        self._sync(p, 'cancelled', f'Paiement {p.number} annulé : {reason}')
        return Response(PaymentSerializer(p).data)
