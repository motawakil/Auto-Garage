from django.db import models, transaction
from django.db.models import F

from apps.core.models import TimeStampedModel


class Supplier(TimeStampedModel):
    name = models.CharField(max_length=150)
    contact_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True)
    ice = models.CharField('ICE', max_length=40, blank=True)
    delivery_days = models.PositiveIntegerField('délai de livraison (jours)', default=2)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Part(TimeStampedModel):
    CONDITION_CHOICES = [('new', 'Neuf'), ('used', 'Occasion'), ('refurbished', 'Reconditionné')]
    CATEGORY_CHOICES = [
        ('body', 'Carrosserie'), ('engine', 'Moteur'), ('brakes', 'Freinage'),
        ('suspension', 'Suspension'), ('electrical', 'Électricité'), ('filters', 'Filtration'),
        ('lighting', 'Éclairage'), ('paint', 'Peinture'), ('fluids', 'Lubrifiants'),
        ('other', 'Autre'),
    ]

    reference = models.CharField('référence interne', max_length=60, unique=True)
    oem_reference = models.CharField('référence OEM', max_length=60, blank=True)
    alt_references = models.CharField('références alternatives', max_length=255, blank=True)
    designation = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    brand = models.CharField('marque compatible', max_length=60, blank=True)
    compatible_models = models.CharField(max_length=255, blank=True)
    year_from = models.PositiveIntegerField(null=True, blank=True)
    year_to = models.PositiveIntegerField(null=True, blank=True)
    engines = models.CharField('motorisations', max_length=255, blank=True)
    compatibility_verified = models.BooleanField(default=False)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name='parts')
    quantity = models.IntegerField(default=0)
    min_quantity = models.IntegerField(default=1)
    location = models.CharField('emplacement', max_length=60, blank=True)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='new')

    class Meta:
        ordering = ['designation']

    def __str__(self):
        return f'{self.reference} · {self.designation}'

    @property
    def is_low(self):
        return self.quantity <= self.min_quantity


class StockMovement(models.Model):
    KIND_CHOICES = [
        ('in', 'Entrée'), ('out', 'Sortie réparation'), ('supplier_return', 'Retour fournisseur'),
        ('unused_return', 'Retour pièce inutilisée'), ('adjustment', 'Ajustement'),
    ]
    # Sign applied to quantity for each kind; adjustments carry their own sign.
    SIGNS = {'in': 1, 'out': -1, 'supplier_return': -1, 'unused_return': 1, 'adjustment': 1}

    created_at = models.DateTimeField(auto_now_add=True)
    date = models.DateField()
    part = models.ForeignKey(Part, on_delete=models.PROTECT, related_name='movements')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    quantity = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    repair_order = models.ForeignKey('repairs.RepairOrder', null=True, blank=True,
                                     on_delete=models.SET_NULL, related_name='stock_movements')
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-date', '-created_at']

    @property
    def signed_quantity(self):
        return self.quantity * self.SIGNS[self.kind]

    def save(self, *args, **kwargs):
        # Movements are immutable once recorded: stock is only adjusted on creation.
        is_new = self.pk is None
        with transaction.atomic():
            super().save(*args, **kwargs)
            if is_new:
                Part.objects.filter(pk=self.part_id).update(quantity=F('quantity') + self.signed_quantity)


class OemReference(TimeStampedModel):
    """
    One line of the vehicle OEM catalogue (brand / model / year / engine → part designation).
    A reference is never invented: lines start as `unknown` and are confirmed only with a traceable source.
    """
    STATUS_CHOICES = [
        ('unknown', 'Inconnue — à rechercher'),
        ('to_verify', 'À vérifier'),
        ('confirmed', 'Confirmée constructeur'),
    ]

    brand = models.CharField(max_length=60)
    model = models.CharField(max_length=80)
    year = models.PositiveIntegerField(null=True, blank=True)
    phase = models.CharField(max_length=120, blank=True)
    engine = models.CharField('motorisation', max_length=80, blank=True)
    family = models.CharField('famille', max_length=80)
    designation = models.CharField('désignation pièce', max_length=200)
    oem_reference = models.CharField('référence OEM', max_length=60, blank=True, db_index=True)
    superseded_reference = models.CharField('référence remplacée / supersession', max_length=120, blank=True)
    position = models.CharField('côté / position', max_length=80, blank=True)
    variant = models.CharField('variante / équipement', max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    compatibility_confirmed = models.BooleanField(default=False)
    price_oem = models.DecimalField('prix OEM Maroc', max_digits=12, decimal_places=2, null=True, blank=True)
    price_aftermarket = models.DecimalField('prix adaptable Maroc', max_digits=12, decimal_places=2, null=True, blank=True)
    price_used = models.DecimalField('prix occasion Maroc', max_digits=12, decimal_places=2, null=True, blank=True)
    source_market = models.CharField('marché / devise source', max_length=80, blank=True)
    source_url = models.CharField('source / URL', max_length=500, blank=True)
    verified_at = models.DateField('date de vérification', null=True, blank=True)
    notes = models.TextField(blank=True)
    part = models.ForeignKey(Part, null=True, blank=True, on_delete=models.SET_NULL, related_name='oem_lines',
                             help_text='Pièce du stock correspondant à cette ligne.')

    class Meta:
        ordering = ['brand', 'model', 'family', 'designation']
        unique_together = [('brand', 'model', 'year', 'engine', 'designation')]

    def __str__(self):
        return f'{self.brand} {self.model} · {self.designation}'


class OemEquivalence(TimeStampedModel):
    """Equivalent reference for an OEM line: supersession, aftermarket brand or used part."""
    KIND_CHOICES = [
        ('supersession', 'Supersession constructeur'),
        ('aftermarket', 'Adaptable (équipementier)'),
        ('used', 'Occasion'),
    ]

    oem = models.ForeignKey(OemReference, on_delete=models.CASCADE, related_name='equivalences')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='aftermarket')
    manufacturer = models.CharField('fabricant', max_length=80, blank=True)
    reference = models.CharField('référence équivalente', max_length=80, db_index=True)
    price = models.DecimalField('prix Maroc', max_digits=12, decimal_places=2, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL)
    verified = models.BooleanField(default=False)
    source_url = models.CharField('source / URL', max_length=500, blank=True)
    verified_at = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['oem', 'kind', 'manufacturer']
        unique_together = [('oem', 'reference')]

    def __str__(self):
        return f'{self.manufacturer} {self.reference}'.strip()
