from django.core.management.base import BaseCommand, CommandError

from apps.inventory.oem_import import import_oem_workbook


class Command(BaseCommand):
    help = 'Importe un catalogue OEM véhicule depuis un fichier Excel (modèle Base_OEM_*.xlsx).'

    def add_arguments(self, parser):
        parser.add_argument('path')

    def handle(self, *args, path, **opts):
        try:
            stats = import_oem_workbook(path)
        except (OSError, ValueError) as exc:
            raise CommandError(str(exc))
        self.stdout.write(self.style.SUCCESS(
            f"{stats['created']} créée(s), {stats['updated']} mise(s) à jour, {stats['skipped']} inchangée(s)."))
        for err in stats['errors']:
            self.stdout.write(self.style.WARNING(err))
