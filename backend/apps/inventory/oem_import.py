"""Import of the vehicle OEM catalogue from the garage's Excel template (Base_OEM_*.xlsx)."""
import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import openpyxl
from django.db import transaction

from .models import OemReference

# Normalised Excel header → model field.
COLUMNS = {
    'marque': 'brand',
    'modele': 'model',
    'annee': 'year',
    'phase': 'phase',
    'motorisation': 'engine',
    'famille': 'family',
    'designation piece': 'designation',
    'reference oem': 'oem_reference',
    'reference remplacee / supersession': 'superseded_reference',
    'cote / position': 'position',
    'variante / equipement': 'variant',
    'statut reference': 'status',
    'compatibilite confirmee': 'compatibility_confirmed',
    'prix oem maroc (mad)': 'price_oem',
    'prix adaptable maroc (mad)': 'price_aftermarket',
    'prix occasion maroc (mad)': 'price_used',
    'marche / devise source': 'source_market',
    'source / url': 'source_url',
    'date verification': 'verified_at',
    'notes': 'notes',
}
REQUIRED = ('brand', 'model', 'family', 'designation')


def _norm(text):
    text = unicodedata.normalize('NFKD', str(text or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', text).strip().lower()


def _status(value, oem_reference):
    v = _norm(value)
    if not oem_reference:
        return 'unknown'  # no reference → never anything but unknown
    if v.startswith('confirm'):
        return 'confirmed'
    return 'to_verify'


def _decimal(value):
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value).replace(' ', '').replace(',', '.'))
    except InvalidOperation:
        return None


def _date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except (TypeError, ValueError):
            pass
    return None


def _clean(field, value):
    if field == 'year':
        try:
            return int(value)
        except (TypeError, ValueError):
            return None
    if field in ('price_oem', 'price_aftermarket', 'price_used'):
        return _decimal(value)
    if field == 'verified_at':
        return _date(value)
    if field == 'compatibility_confirmed':
        return _norm(value) in ('oui', 'yes', 'true', '1')
    return str(value).strip() if value is not None else ''


@transaction.atomic
def import_oem_workbook(file):
    """
    Upsert every catalogue line keyed by (brand, model, year, engine, designation).
    Empty cells never overwrite data already completed in the application.
    """
    wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
    ws = next((s for s in wb.worksheets if 'catalogue' in _norm(s.title)), wb.worksheets[0])
    rows = ws.iter_rows(values_only=True)
    headers = [COLUMNS.get(_norm(h)) for h in next(rows)]
    missing = [f for f in REQUIRED if f not in headers]
    if missing:
        raise ValueError(f"Colonnes obligatoires absentes : {', '.join(missing)}")

    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': []}
    for line_no, row in enumerate(rows, start=2):
        if not any(row):
            continue
        data = {f: _clean(f, v) for f, v in zip(headers, row) if f}
        if any(not data.get(f) for f in REQUIRED):
            stats['skipped'] += 1
            stats['errors'].append(f'Ligne {line_no} : marque, modèle, famille et désignation sont obligatoires.')
            continue
        data['status'] = _status(data.get('status'), data.get('oem_reference'))
        if data['status'] != 'confirmed':
            data['compatibility_confirmed'] = False

        key = {k: data.pop(k) for k in ('brand', 'model', 'year', 'engine', 'designation')}
        obj = OemReference.objects.filter(**key).first()
        if obj is None:
            OemReference.objects.create(**key, **data)
            stats['created'] += 1
            continue
        changed = False
        for field, value in data.items():
            if value in (None, '') or (field == 'status' and value == 'unknown' and obj.oem_reference):
                continue
            if field == 'compatibility_confirmed' and not value:
                continue
            if getattr(obj, field) != value:
                setattr(obj, field, value)
                changed = True
        if changed:
            obj.save()
            stats['updated'] += 1
        else:
            stats['skipped'] += 1
    return stats
