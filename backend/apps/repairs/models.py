from django.db import models

from apps.core.models import TimeStampedModel, next_number


class InsuranceCompany(TimeStampedModel):
    name = models.CharField(max_length=150, unique=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    payment_delay_days = models.PositiveIntegerField('délai de paiement (jours)', default=60)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'insurance companies'

    def __str__(self):
        return self.name


class Expert(TimeStampedModel):
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=80)
    firm = models.CharField('cabinet', max_length=150, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    companies = models.ManyToManyField(InsuranceCompany, blank=True, related_name='experts')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['last_name']

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()


class RepairOrder(TimeStampedModel):
    STATUS_CHOICES = [
        ('new', 'Nouveau dossier'),
        ('waiting_documents', 'En attente de documents'),
        ('waiting_expertise', "En attente d'expertise"),
        ('expertise_done', 'Expertise effectuée'),
        ('waiting_insurance', "En attente d'accord assurance"),
        ('waiting_quote', 'En attente de validation du devis'),
        ('waiting_parts', 'En attente de pièces'),
        ('in_progress', 'Réparation en cours'),
        ('quality_check', 'Contrôle qualité'),
        ('done', 'Terminé'),
        ('delivered', 'Livré au client'),
        ('waiting_payment', 'En attente de paiement'),
        ('closed', 'Clôturé'),
    ]
    TYPE_CHOICES = [
        ('mechanical', 'Mécanique'), ('body', 'Carrosserie'), ('paint', 'Peinture'),
        ('polish', 'Polissage'), ('electrical', 'Diagnostic électrique'), ('other', 'Autre'),
    ]
    PRIORITY_CHOICES = [('low', 'Basse'), ('normal', 'Normale'), ('high', 'Haute'), ('urgent', 'Urgente')]

    number = models.CharField(max_length=30, unique=True, editable=False)
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='repair_orders')
    vehicle = models.ForeignKey('clients.Vehicle', on_delete=models.PROTECT, related_name='repair_orders')
    repair_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='mechanical')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    entry_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    delivered_at = models.DateField(null=True, blank=True)
    mileage_in = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField('description des dommages / panne', blank=True)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    employees = models.ManyToManyField('staff.Employee', blank=True, related_name='repair_orders')
    notes = models.TextField(blank=True)

    # Insurance claim (sinistre)
    is_insurance = models.BooleanField(default=False)
    insurance_company = models.ForeignKey(InsuranceCompany, null=True, blank=True, on_delete=models.SET_NULL, related_name='repair_orders')
    claim_number = models.CharField('numéro de sinistre', max_length=60, blank=True)
    policy_number = models.CharField('numéro de police', max_length=60, blank=True)
    accident_date = models.DateField(null=True, blank=True)
    accident_circumstances = models.TextField(blank=True)
    expert = models.ForeignKey(Expert, null=True, blank=True, on_delete=models.SET_NULL, related_name='repair_orders')
    expertise_date = models.DateField(null=True, blank=True)
    insurance_estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    insurance_approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductible = models.DecimalField('franchise', max_digits=12, decimal_places=2, default=0)
    insurance_step = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['-entry_date', '-created_at']

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_number(RepairOrder, 'number', 'DR')
        super().save(*args, **kwargs)


class RepairTask(TimeStampedModel):
    STATUS_CHOICES = [('todo', 'À faire'), ('in_progress', 'En cours'), ('blocked', 'Bloquée'), ('done', 'Terminée')]
    KIND_CHOICES = [
        ('disassembly', 'Démontage / remontage'), ('straightening', 'Redressage carrosserie'),
        ('paint_prep', 'Préparation peinture'), ('paint', 'Peinture'), ('polish', 'Polissage et finition'),
        ('electrical', 'Diagnostic électrique'), ('mechanical', 'Réparation mécanique'),
        ('final_check', 'Contrôle final et livraison'), ('other', 'Autre'),
    ]

    repair_order = models.ForeignKey(RepairOrder, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=150)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='other')
    employee = models.ForeignKey('staff.Employee', null=True, blank=True, on_delete=models.SET_NULL, related_name='tasks')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateField(null=True, blank=True)
    hours_spent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return self.title
