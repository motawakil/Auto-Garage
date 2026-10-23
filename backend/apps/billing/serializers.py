from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.core.models import ActivityLog
from .models import Invoice, InvoiceLine, Payment, Quote, QuoteLine, money

LINE_READ = ['amount_ht', 'amount_vat', 'amount_ttc']


class LineSerializerMixin(serializers.ModelSerializer):
    amount_ht = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    amount_vat = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    amount_ttc = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    id = serializers.IntegerField(required=False)


class QuoteLineSerializer(LineSerializerMixin):
    class Meta:
        model = QuoteLine
        exclude = ['quote']


class InvoiceLineSerializer(LineSerializerMixin):
    class Meta:
        model = InvoiceLine
        exclude = ['invoice']


class TotalsField(serializers.Field):
    def __init__(self, **kwargs):
        kwargs['source'] = '*'
        kwargs['read_only'] = True
        super().__init__(**kwargs)

    def to_representation(self, obj):
        return {k: float(v) for k, v in obj.compute_totals().items()}


class LinesDocumentSerializer(serializers.ModelSerializer):
    """Writes lines as a whole list: the document's lines are replaced atomically."""
    line_model = None
    fk_name = None
    totals = TotalsField()
    client_name = serializers.CharField(source='repair_order.client.display_name', read_only=True)
    client_id = serializers.IntegerField(source='repair_order.client_id', read_only=True)
    vehicle_label = serializers.CharField(source='repair_order.vehicle.__str__', read_only=True)
    repair_order_number = serializers.CharField(source='repair_order.number', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    is_locked = serializers.BooleanField(read_only=True)

    def _write_lines(self, instance, lines):
        self.line_model.objects.filter(**{self.fk_name: instance}).delete()
        for i, data in enumerate(lines):
            data.pop('id', None)
            data.setdefault('position', i)
            self.line_model.objects.create(**{self.fk_name: instance}, **data)

    def validate(self, attrs):
        if self.instance and self.instance.is_locked and 'lines' in attrs:
            raise serializers.ValidationError(
                {'lines': 'Document verrouillé : créez une nouvelle version au lieu de le modifier.'})
        return attrs

    @transaction.atomic
    def create(self, validated):
        lines = validated.pop('lines', [])
        obj = super().create(validated)
        self._write_lines(obj, lines)
        self._after_save(obj)
        return obj

    @transaction.atomic
    def update(self, instance, validated):
        lines = validated.pop('lines', None)
        obj = super().update(instance, validated)
        if lines is not None:
            self._write_lines(obj, lines)
        self._after_save(obj)
        return obj

    def _after_save(self, obj):
        pass


class QuoteSerializer(LinesDocumentSerializer):
    line_model, fk_name = QuoteLine, 'quote'
    lines = QuoteLineSerializer(many=True, required=False)
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    versions = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = '__all__'
        read_only_fields = ['version', 'previous', 'total_ttc_cache']

    def get_versions(self, obj):
        return list(Quote.objects.filter(number=obj.number).order_by('version')
                    .values('id', 'version', 'status', 'total_ttc_cache', 'date'))

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance and self.instance.status == 'accepted' and attrs.get('status', 'accepted') != 'accepted':
            raise serializers.ValidationError({'status': 'Un devis accepté ne peut pas être remplacé silencieusement. Créez une révision.'})
        return attrs

    def _after_save(self, obj):
        obj.refresh_cache()
        ro = obj.repair_order
        if obj.status == 'accepted':
            ro.estimated_cost = obj.total_ttc_cache
            ro.save(update_fields=['estimated_cost'])
        ActivityLog.record('quote', obj, 'saved', f'Devis {obj.number} v{obj.version} — {obj.get_status_display()}',
                           client_id=ro.client_id, repair_order_id=ro.pk)


class InvoiceSerializer(LinesDocumentSerializer):
    line_model, fk_name = InvoiceLine, 'invoice'
    lines = InvoiceLineSerializer(many=True, required=False)
    quote_number = serializers.CharField(source='quote.number', read_only=True, default='')
    paid = serializers.DecimalField(source='paid_cache', max_digits=14, decimal_places=2, read_only=True)
    balance = serializers.SerializerMethodField()
    client_share = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['issued_at', 'total_ttc_cache', 'paid_cache']

    def get_balance(self, obj):
        return money(obj.total_ttc_cache) - money(obj.paid_cache)

    def get_client_share(self, obj):
        return money(obj.total_ttc_cache) - money(obj.insurance_amount)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        inst = self.instance
        if inst and inst.is_locked:
            allowed = {'status', 'notes', 'cancel_reason', 'due_date'}
            changed = {k for k, v in attrs.items() if getattr(inst, k, None) != v}
            if changed - allowed:
                raise serializers.ValidationError('Facture émise : seuls le statut, l’échéance et les notes sont modifiables.')
            if attrs.get('status') == 'cancelled' and not attrs.get('cancel_reason'):
                raise serializers.ValidationError({'cancel_reason': "Le motif d'annulation est obligatoire."})
        return attrs

    def _after_save(self, obj):
        if obj.status != 'draft' and not obj.issued_at:
            obj.issued_at = timezone.now()
            Invoice.objects.filter(pk=obj.pk).update(issued_at=obj.issued_at)
        obj.refresh_status()
        ro = obj.repair_order
        ActivityLog.record('invoice', obj, 'saved', f'Facture {obj.number} — {obj.get_status_display()}',
                           client_id=ro.client_id, repair_order_id=ro.pk)


class PaymentSerializer(serializers.ModelSerializer):
    number = serializers.CharField(read_only=True)
    client_name = serializers.CharField(source='client.display_name', read_only=True)
    repair_order_number = serializers.CharField(source='repair_order.number', read_only=True, default='')
    invoice_number = serializers.CharField(source='invoice.number', read_only=True, default='')
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    method_label = serializers.CharField(source='get_method_display', read_only=True)
    origin_label = serializers.CharField(source='get_origin_display', read_only=True)
    cheque_status_label = serializers.CharField(source='get_cheque_status_display', read_only=True)
    is_received = serializers.BooleanField(read_only=True)
    is_pending = serializers.BooleanField(read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'

    def validate(self, attrs):
        g = lambda k: attrs.get(k, getattr(self.instance, k, None))
        if money(g('amount')) <= 0:
            raise serializers.ValidationError({'amount': 'Le montant doit être positif.'})
        if g('kind') == 'refund' and not g('reason'):
            raise serializers.ValidationError({'reason': 'Le motif du remboursement est obligatoire.'})
        if g('method') == 'cheque':
            if not g('cheque_status'):
                attrs['cheque_status'] = 'pending'
        else:
            attrs['cheque_status'] = ''
        invoice, ro = g('invoice'), g('repair_order')
        if invoice and not ro:
            attrs['repair_order'] = ro = invoice.repair_order
        if invoice and ro and invoice.repair_order_id != ro.pk:
            raise serializers.ValidationError({'invoice': "La facture n'appartient pas à ce dossier."})
        if ro and g('client') and ro.client_id != g('client').pk and g('origin') == 'client':
            raise serializers.ValidationError({'client': "Ce dossier n'appartient pas à ce client."})
        if invoice and invoice.status in ('draft', 'cancelled'):
            raise serializers.ValidationError({'invoice': 'Impossible d’encaisser une facture brouillon ou annulée.'})
        return attrs
