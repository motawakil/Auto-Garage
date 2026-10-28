import getpass

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Company, Membership
from apps.accounts.roles import ROLE_CHOICES


def ask_password(email):
    """Interactive only: passwords never travel through shell history or arguments."""
    while True:
        pwd = getpass.getpass(f'Mot de passe pour {email} : ')
        if pwd != getpass.getpass('Confirmation : '):
            print('Les mots de passe ne correspondent pas.')
            continue
        try:
            password_validation.validate_password(pwd)
            return pwd
        except ValidationError as exc:
            print(' '.join(exc.messages))


def create_login(company, email, role, first_name='', last_name=''):
    User = get_user_model()
    email = email.strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise CommandError(f'Un compte existe déjà avec {email}.')
    user = User.objects.create_user(username=email, email=email, first_name=first_name, last_name=last_name,
                                    password=ask_password(email))
    Membership.objects.create(user=user, company=company, role=role)
    return user


class Command(BaseCommand):
    help = 'Crée une entreprise et son premier administrateur (en attendant le portail plateforme).'

    def add_arguments(self, parser):
        parser.add_argument('name')
        parser.add_argument('--admin-email', required=True)
        parser.add_argument('--first-name', default='')
        parser.add_argument('--last-name', default='')
        parser.add_argument('--city', default='')

    @transaction.atomic
    def handle(self, *args, name, admin_email, first_name, last_name, city, **opts):
        company = Company.objects.create(name=name, city=city)
        create_login(company, admin_email, 'admin', first_name, last_name)
        self.stdout.write(self.style.SUCCESS(f'Entreprise « {company.name} » ({company.slug}) créée avec l’administrateur {admin_email}.'))


ROLES = [r for r, _ in ROLE_CHOICES]
