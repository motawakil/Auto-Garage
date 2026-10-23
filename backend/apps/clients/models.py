from django.db import models

from apps.core.models import TimeStampedModel


class Client(TimeStampedModel):
    KIND_CHOICES = [('individual', 'Particulier'), ('company', 'Entreprise')]

    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='individual')
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=80)
    company_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=40)
    phone_secondary = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True)
    cin = models.CharField('CIN', max_length=30, blank=True)
    ice = models.CharField('ICE', max_length=40, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        if self.kind == 'company' and self.company_name:
            return self.company_name
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def code(self):
        return f'CL-{self.pk:05d}'


class Vehicle(TimeStampedModel):
    FUEL_CHOICES = [
        ('diesel', 'Diesel'), ('petrol', 'Essence'), ('hybrid', 'Hybride'),
        ('electric', 'Électrique'), ('lpg', 'GPL'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='vehicles')
    brand = models.CharField(max_length=60)
    model = models.CharField(max_length=80)
    generation = models.CharField(max_length=60, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    engine = models.CharField('motorisation', max_length=80, blank=True)
    fuel = models.CharField(max_length=20, choices=FUEL_CHOICES, blank=True)
    plate = models.CharField('immatriculation', max_length=30, unique=True)
    vin = models.CharField('VIN', max_length=17, blank=True)
    color = models.CharField(max_length=40, blank=True)
    mileage = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.brand} {self.model} · {self.plate}'
