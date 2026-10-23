from django.db import models

from apps.core.models import TimeStampedModel


class Employee(TimeStampedModel):
    ROLE_CHOICES = [
        ('manager', 'Gérant'), ('reception', 'Réception'), ('mechanic', 'Mécanicien'),
        ('body', 'Carrossier'), ('painter', 'Peintre'), ('electrician', 'Électricien'),
        ('accountant', 'Comptable'), ('other', 'Autre'),
    ]

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='mechanic')
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    hourly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hired_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=12, blank=True, default='#ef4444')

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()
