from django.db import models
from django.utils.deconstruct import deconstructible

from apps.accounts.context import get_current_user
from apps.accounts.models import Company, CompanyScopedModel


class TimeStampedModel(CompanyScopedModel):
    """Base of every business record: owned by one company, timestamped."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class GarageSettings(models.Model):
    """One per company: the garage identity used on quotes and invoices."""
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='garage_settings')
    name = models.CharField(max_length=120, default='Mon garage')
    slogan = models.CharField(max_length=200, blank=True, default='Mécanique · Carrosserie · Peinture')
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True, default='Casablanca')
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    ice = models.CharField('ICE', max_length=40, blank=True)
    rc = models.CharField('RC', max_length=40, blank=True)
    if_number = models.CharField('IF', max_length=40, blank=True)
    patente = models.CharField(max_length=40, blank=True)
    rib = models.CharField('RIB', max_length=60, blank=True)
    parts_vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    services_vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default='MAD')
    quote_validity_days = models.PositiveIntegerField(default=30)
    invoice_due_days = models.PositiveIntegerField(default=30)
    invoice_footer = models.TextField(blank=True)

    @classmethod
    def load(cls, company):
        company_id = getattr(company, 'pk', company)
        obj, created = cls.objects.get_or_create(company_id=company_id)
        if created and obj.name == 'Mon garage':
            obj.name = Company.objects.get(pk=company_id).name
            obj.save(update_fields=['name'])
        return obj


class ActivityLog(CompanyScopedModel):
    """Chronological trail of important actions, shown in histories."""
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    entity = models.CharField(max_length=40)
    entity_id = models.PositiveIntegerField()
    action = models.CharField(max_length=40)
    message = models.CharField(max_length=255)
    client_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    repair_order_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def record(cls, entity, obj, action, message, client_id=None, repair_order_id=None):
        user = get_current_user()
        return cls.objects.create(
            company_id=obj.company_id, user=user if user and user.is_authenticated else None,
            entity=entity, entity_id=obj.pk, action=action, message=message[:255],
            client_id=client_id, repair_order_id=repair_order_id,
        )


def next_number(model, field, prefix, company_id):
    """Sequential human number such as DR-2026-0042, scoped by company and year."""
    from django.utils import timezone
    year = timezone.localdate().year
    base = f'{prefix}-{year}-'
    last = (model.objects.filter(company_id=company_id, **{f'{field}__startswith': base})
            .order_by(f'-{field}').values_list(field, flat=True).first())
    seq = int(last.rsplit('-', 1)[1]) + 1 if last else 1
    return f'{base}{seq:04d}'


@deconstructible
class CompanyUploadTo:
    """Files are stored per company: <folder>/<company id>/<yyyy>/<mm>/<name>."""

    def __init__(self, folder):
        self.folder = folder

    def __call__(self, instance, filename):
        from django.utils import timezone
        return f'{self.folder}/{instance.company_id}/{timezone.now():%Y/%m}/{filename}'

    def __eq__(self, other):
        return isinstance(other, CompanyUploadTo) and other.folder == self.folder


def company_upload_to(folder):
    return CompanyUploadTo(folder)


class Document(TimeStampedModel):
    KIND_CHOICES = [
        ('photo_before', 'Photo avant réparation'), ('photo_progress', 'Photo de progression'),
        ('photo_after', 'Photo après réparation'), ('registration', 'Carte grise'),
        ('insurance', 'Document assurance'), ('expertise', "Rapport d'expertise"),
        ('invoice', 'Facture'), ('receipt', 'Justificatif de paiement'), ('other', 'Autre'),
    ]

    title = models.CharField(max_length=150)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='other')
    file = models.FileField(upload_to=company_upload_to('documents'))
    client = models.ForeignKey('clients.Client', null=True, blank=True, on_delete=models.CASCADE, related_name='documents')
    vehicle = models.ForeignKey('clients.Vehicle', null=True, blank=True, on_delete=models.SET_NULL, related_name='documents')
    repair_order = models.ForeignKey('repairs.RepairOrder', null=True, blank=True, on_delete=models.SET_NULL, related_name='documents')
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']
