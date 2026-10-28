from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Company
from .create_company import ROLES, create_login


class Command(BaseCommand):
    help = 'Ajoute un identifiant (admin ou user) à une entreprise existante.'

    def add_arguments(self, parser):
        parser.add_argument('--company', required=True, help='Slug de l’entreprise')
        parser.add_argument('--email', required=True)
        parser.add_argument('--role', choices=ROLES, default='user')
        parser.add_argument('--first-name', default='')
        parser.add_argument('--last-name', default='')

    @transaction.atomic
    def handle(self, *args, company, email, role, first_name, last_name, **opts):
        try:
            target = Company.objects.get(slug=company)
        except Company.DoesNotExist:
            raise CommandError(f'Entreprise « {company} » introuvable.')
        create_login(target, email, role, first_name, last_name)
        self.stdout.write(self.style.SUCCESS(f'Compte {email} ({role}) ajouté à « {target.name} ».'))
