from django.conf import settings
from django.db import models
from django.utils.text import slugify

from .roles import ROLE_CHOICES


class Company(models.Model):
    """
    Tenant: a garage using the application. Every business record belongs to exactly one company.
    Companies and their logins are created by the platform (future admin portal / `create_company`), never by users.
    """
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=80, unique=True)
    ice = models.CharField('ICE', max_length=40, blank=True)
    city = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'entreprise'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base, n = slugify(self.name)[:70] or 'entreprise', 1
            self.slug = base
            while Company.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                n += 1
                self.slug = f'{base}-{n}'
        super().save(*args, **kwargs)


class Membership(models.Model):
    """Links a login to its single company and role."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='membership')
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'accès entreprise'

    def __str__(self):
        return f'{self.user} · {self.company} ({self.role})'


class CompanyScopedModel(models.Model):
    """Abstract base for every tenant-owned record."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='+', editable=False)

    class Meta:
        abstract = True
