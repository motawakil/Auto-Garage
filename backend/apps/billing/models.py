from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel, GarageSettings, next_number

ZERO = Decimal('0.00')
CENT = Decimal('0.01')


def money(value):
    return Decimal(value or 0).quantize(CENT, rounding=ROUND_HALF_UP)


class DocumentLine(models.Model):
    """Shared shape of a quote/invoice line. Parts and services follow different VAT rules."""
    TYPE_CHOICES = [('part', 'Pièce'), ('service', 'Prestation')]
    OPERATION_CHOICES = [
        ('repair', 'Réparer'), ('replace_new', 'Remplacer (neuf)'),
        ('replace_used', 'Remplacer (occasion)'), ('pending_disassembly', 'Attendre démontage'),
        ('labor', "Main-d'œuvre"),
    ]

    position = models.PositiveIntegerField(default=0)
    line_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='part')
    part = models.ForeignKey('inventory.Part', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reference = models.CharField(max_length=60, blank=True)
    designation = models.CharField(max_length=255)
    operation = models.CharField(max_length=30, choices=OPERATION_CHOICES, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        abstract = True
        ordering = ['position', 'id']

    def save(self, *args, **kwargs):
        if self.vat_rate is None:
            cfg = GarageSettings.load()
            self.vat_rate = cfg.parts_vat_rate if self.line_type == 'part' else cfg.services_vat_rate
        super().save(*args, **kwargs)

    @property
    def amount_ht(self):
        gross = Decimal(self.quantity) * Decimal(self.unit_price)
        return money(gross * (1 - Decimal(self.discount_pct) / 100))

    @property
    def amount_vat(self):
        return money(self.amount_ht * Decimal(self.vat_rate or 0) / 100)

    @property
    def amount_ttc(self):
        return self.amount_ht + self.amount_vat


class TotalsMixin:
    """Recap shown at the bottom of quotes and invoices."""

    def compute_totals(self):
        lines = list(self.lines.all())
        parts = [l for l in lines if l.line_type == 'part']
        services = [l for l in lines if l.line_type == 'service']
        parts_ht = sum((l.amount_ht for l in parts), ZERO)
        parts_vat = sum((l.amount_vat for l in parts), ZERO)
        services_ht = sum((l.amount_ht for l in services), ZERO)
        services_vat = sum((l.amount_vat for l in services), ZERO)
        return {
            'parts_ht': parts_ht, 'parts_vat': parts_vat, 'parts_ttc': parts_ht + parts_vat,
            'services_ht': services_ht, 'services_vat': services_vat, 'services_ttc': services_ht + services_vat,
            'total_ht': parts_ht + services_ht, 'total_vat': parts_vat + services_vat,
            'total_ttc': parts_ht + parts_vat + services_ht + services_vat,
        }


class Quote(TotalsMixin, TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Brouillon'), ('sent', 'Envoyé'), ('pending', 'En attente'),
        ('accepted', 'Accepté'), ('refused', 'Refusé'), ('cancelled', 'Annulé'),
    ]
    KIND_CHOICES = [('estimate', 'Devis estimatif'), ('insurance', 'Devis approuvé assurance')]
    LOCKED_STATUSES = ('accepted', 'refused', 'cancelled')

    number = models.CharField(max_length=30, editable=False)
    version = models.PositiveIntegerField(default=1)
    previous = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='revisions')
    repair_order = models.ForeignKey('repairs.RepairOrder', on_delete=models.CASCADE, related_name='quotes')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='estimate')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    date = models.DateField(default=timezone.localdate)
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    total_ttc_cache = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = [('number', 'version')]

    def __str__(self):
        return f'{self.number} v{self.version}'

    @property
    def is_locked(self):
        return self.status in self.LOCKED_STATUSES

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_number(Quote, 'number', 'DV')
        super().save(*args, **kwargs)

    def refresh_cache(self):
        self.total_ttc_cache = self.compute_totals()['total_ttc']
        Quote.objects.filter(pk=self.pk).update(total_ttc_cache=self.total_ttc_cache)


class QuoteLine(DocumentLine):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='lines')

    class Meta(DocumentLine.Meta):
        pass


class Invoice(TotalsMixin, TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Brouillon'), ('issued', 'Émise'), ('partial', 'Partiellement payée'),
        ('paid', 'Payée'), ('overdue', 'En retard'), ('disputed', 'En litige'), ('cancelled', 'Annulée'),
    ]

    number = models.CharField(max_length=30, unique=True, editable=False)
    repair_order = models.ForeignKey('repairs.RepairOrder', on_delete=models.PROTECT, related_name='invoices')
    quote = models.ForeignKey(Quote, null=True, blank=True, on_delete=models.SET_NULL, related_name='invoices')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    insurance_amount = models.DecimalField('part assurance TTC', max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    cancel_reason = models.CharField(max_length=255, blank=True)
    total_ttc_cache = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_cache = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return self.number

    @property
    def is_locked(self):
        return self.status != 'draft'

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_number(Invoice, 'number', 'FA')
        super().save(*args, **kwargs)

    def paid_amount(self):
        return sum((p.counted_amount for p in self.payments.all()), ZERO)

    def refresh_status(self):
        """Recompute cached totals and the payment-driven status."""
        total = self.compute_totals()['total_ttc']
        paid = self.paid_amount()
        status = self.status
        if status not in ('draft', 'cancelled', 'disputed'):
            if paid >= total and total > 0:
                status = 'paid'
            elif paid > 0:
                status = 'partial'
            elif self.due_date and self.due_date < timezone.localdate():
                status = 'overdue'
            else:
                status = 'issued'
        Invoice.objects.filter(pk=self.pk).update(total_ttc_cache=total, paid_cache=paid, status=status)
        self.total_ttc_cache, self.paid_cache, self.status = total, paid, status


class InvoiceLine(DocumentLine):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')

    class Meta(DocumentLine.Meta):
        pass


class Payment(TimeStampedModel):
    KIND_CHOICES = [('payment', 'Paiement'), ('deposit', 'Acompte'), ('refund', 'Remboursement')]
    METHOD_CHOICES = [
        ('cash', 'Espèces'), ('transfer', 'Virement bancaire'), ('cheque', 'Chèque'),
        ('card', 'Carte bancaire'), ('other', 'Autre'),
    ]
    ORIGIN_CHOICES = [('client', 'Client'), ('insurance', 'Assurance')]
    CHEQUE_STATUS_CHOICES = [
        ('received', 'Reçu'), ('pending', "En attente d'encaissement"), ('cashed', 'Encaissé'),
        ('rejected', 'Rejeté'), ('cancelled', 'Annulé'),
    ]

    date = models.DateField(default=timezone.localdate)
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='payments')
    repair_order = models.ForeignKey('repairs.RepairOrder', null=True, blank=True, on_delete=models.PROTECT, related_name='payments')
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.PROTECT, related_name='payments')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='payment')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    origin = models.CharField(max_length=20, choices=ORIGIN_CHOICES, default='client')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField('référence transaction', max_length=80, blank=True)
    bank = models.CharField(max_length=80, blank=True)
    cheque_due_date = models.DateField("échéance", null=True, blank=True)
    cheque_status = models.CharField(max_length=20, choices=CHEQUE_STATUS_CHOICES, blank=True)
    refund_of = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='refunds')
    reason = models.CharField('motif', max_length=255, blank=True)
    comment = models.TextField(blank=True)
    receipt = models.FileField('justificatif', upload_to='receipts/%Y/%m/', null=True, blank=True)
    is_cancelled = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date', '-created_at']

    @property
    def number(self):
        return f'PA-{self.pk:05d}'

    @property
    def is_received(self):
        """Money actually in the till: an uncashed cheque is not received yet."""
        if self.is_cancelled:
            return False
        if self.method == 'cheque':
            return self.cheque_status == 'cashed'
        return True

    @property
    def is_pending(self):
        return (not self.is_cancelled and self.method == 'cheque'
                and self.cheque_status in ('received', 'pending'))

    @property
    def signed_amount(self):
        return -money(self.amount) if self.kind == 'refund' else money(self.amount)

    @property
    def counted_amount(self):
        return self.signed_amount if self.is_received else ZERO
