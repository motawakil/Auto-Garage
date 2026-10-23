import random
from datetime import timedelta
from decimal import Decimal

from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.billing.models import Invoice, Payment, Quote, QuoteLine
from apps.billing.services import invoice_from_quote
from apps.clients.models import Client, Vehicle
from apps.core.models import ActivityLog, GarageSettings
from apps.inventory.models import Part, StockMovement, Supplier
from apps.repairs.models import Expert, InsuranceCompany, RepairOrder, RepairTask
from apps.staff.models import Employee

FIRST = ['Youssef', 'Mohamed', 'Fatima Zahra', 'Hamza', 'Salma', 'Omar', 'Khadija', 'Anas', 'Imane', 'Rachid',
         'Nadia', 'Karim', 'Hajar', 'Mehdi', 'Laila', 'Said', 'Amine', 'Siham', 'Driss', 'Zineb']
LAST = ['Benali', 'El Amrani', 'Alaoui', 'Bennani', 'Tazi', 'Chraibi', 'El Idrissi', 'Berrada', 'Fassi', 'Ouazzani',
        'Lahlou', 'Sqalli', 'Kettani', 'Rami', 'Naciri', 'Haddad', 'Zouaoui', 'Mansouri', 'Belkadi', 'Skalli']
CITIES = ['Casablanca', 'Mohammedia', 'Rabat', 'Bouskoura', 'Berrechid']
CARS = [('Renault', 'Clio IV', '1.5 dCi 90'), ('Dacia', 'Logan', '1.5 dCi 75'), ('Dacia', 'Sandero Stepway', '1.0 TCe 90'),
        ('Peugeot', '208', '1.6 BlueHDi 100'), ('Peugeot', '3008', '1.5 BlueHDi 130'), ('Citroën', 'C3', '1.2 PureTech 82'),
        ('Volkswagen', 'Golf 7', '2.0 TDI 150'), ('Mercedes-Benz', 'Classe C W205', 'C220d'), ('Audi', 'A3 8V', '1.6 TDI 110'),
        ('SEAT', 'Ibiza', '1.0 TSI 95'), ('Opel', 'Corsa F', '1.2 Turbo 100'), ('Dacia', 'Duster', '1.5 dCi 110')]
COLORS = ['Blanc', 'Gris', 'Noir', 'Rouge', 'Bleu', 'Argent']


class Command(BaseCommand):
    help = 'Charge un jeu de données de démonstration réaliste.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true')

    @transaction.atomic
    def handle(self, *args, **opts):
        random.seed(7)
        if opts['reset']:
            for m in (Payment, Invoice, Quote, StockMovement, RepairTask, RepairOrder, Vehicle, Client, Part,
                      Supplier, Expert, InsuranceCompany, Employee, ActivityLog):
                m.objects.all().delete()
        today = timezone.localdate()
        cfg = GarageSettings.load()
        cfg.address, cfg.phone, cfg.email = 'Zone industrielle Sidi Bernoussi, Lot 42', '+212 522 00 00 00', 'contact@garage-eljaouhari.ma'
        cfg.ice, cfg.rc, cfg.if_number = '001234567000089', 'RC 456789', 'IF 12345678'
        cfg.invoice_footer = 'Merci de votre confiance. Pièces garanties 12 mois.'
        cfg.save()

        emps = [Employee.objects.create(first_name=f, last_name=l, role=r, phone=f'06 61 {i:02d} 22 33', hourly_cost=Decimal(c), color=col)
                for i, (f, l, r, c, col) in enumerate([
                    ('Abdelilah', 'Jaouhari', 'manager', 0, '#ef4444'), ('Hicham', 'Ait Ali', 'mechanic', 60, '#f97316'),
                    ('Mustapha', 'Ziani', 'body', 55, '#eab308'), ('Brahim', 'Ouali', 'painter', 55, '#22c55e'),
                    ('Adil', 'Moussaoui', 'electrician', 65, '#3b82f6'), ('Samira', 'Hilali', 'reception', 40, '#a855f7')])]
        workers = emps[1:5]

        insurers = [InsuranceCompany.objects.create(name=n, phone=p, payment_delay_days=d) for n, p, d in [
            ('Wafa Assurance', '05 22 54 55 55', 45), ('AXA Assurance Maroc', '05 22 88 92 92', 60),
            ('RMA', '05 22 49 70 00', 60), ('Saham Assurance', '05 22 43 50 00', 75), ('MAMDA-MCMA', '05 37 71 07 07', 90)]]
        experts = []
        for f, l, firm in [('Khalid', 'Benjelloun', 'Cabinet Expertise Auto Atlas'), ('Noureddine', 'Filali', 'Expert Conseil Maroc'),
                           ('Hassan', 'Amrani', 'Cabinet Amrani & Associés')]:
            e = Expert.objects.create(first_name=f, last_name=l, firm=firm, phone=f'06 70 {len(experts)}1 44 55')
            e.companies.set(random.sample(insurers, 2))
            experts.append(e)

        suppliers = [Supplier.objects.create(name=n, contact_name=c, phone=p, city='Casablanca', delivery_days=d) for n, c, p, d in [
            ('Auto Pièces Derb Omar', 'M. Kabbaj', '05 22 30 11 22', 1), ('Bosch Car Service Distribution', 'Mme Idrissi', '05 22 66 77 88', 3),
            ('Peinture Pro Maroc', 'M. Sefrioui', '05 22 40 41 42', 2), ('Casse Auto Ain Sebaa', 'M. Lamrani', '06 62 12 13 14', 1)]]

        catalog = [
            ('PLQ-CL4-AV', '410608481R', 'Plaquettes de frein avant', 'brakes', 'Renault', 'Clio IV, Captur', 2012, 2019, '1.5 dCi', 180, 320),
            ('DSQ-CL4-AV', '402060010R', 'Disques de frein avant (paire)', 'brakes', 'Renault', 'Clio IV', 2012, 2019, '', 420, 690),
            ('FLT-HU-DCI', '8200768913', 'Filtre à huile', 'filters', 'Dacia', 'Logan, Sandero, Duster', 2008, 2022, '1.5 dCi', 35, 70),
            ('FLT-AIR-DCI', '165467674R', 'Filtre à air', 'filters', 'Dacia', 'Logan, Sandero, Duster', 2012, 2022, '1.5 dCi', 60, 120),
            ('PCH-208-AV', '9823209580', 'Pare-chocs avant (apprêté)', 'body', 'Peugeot', '208', 2019, 2024, '', 1450, 2300),
            ('PHR-208-G', '9823192780', 'Phare avant gauche LED', 'lighting', 'Peugeot', '208', 2019, 2024, '', 2200, 3400),
            ('AIL-C3-AVD', '9816750580', 'Aile avant droite', 'body', 'Citroën', 'C3', 2016, 2023, '', 780, 1250),
            ('RTV-GOLF7-D', '5G0857502', 'Rétroviseur droit complet', 'body', 'Volkswagen', 'Golf 7', 2013, 2020, '', 950, 1500),
            ('AMT-W205-AV', 'A2053200130', 'Amortisseur avant', 'suspension', 'Mercedes-Benz', 'Classe C W205', 2014, 2021, '', 1300, 2100),
            ('BAT-70AH', '', 'Batterie 70Ah 640A', 'electrical', '', '', None, None, '', 850, 1250),
            ('HUI-5W30-5L', '', 'Huile moteur 5W30 (5L)', 'fluids', '', '', None, None, '', 260, 420),
            ('KIT-DIST-K9K', '130C17480R', 'Kit distribution + pompe à eau', 'engine', 'Dacia', 'Logan, Sandero, Duster', 2008, 2022, '1.5 dCi', 1100, 1750),
            ('VRN-2K-1L', '', 'Vernis 2K haute brillance (1L)', 'paint', '', '', None, None, '', 190, 320),
            ('APR-GRS-1L', '', 'Apprêt garnissant gris (1L)', 'paint', '', '', None, None, '', 140, 240),
            ('BGI-A3-TDI', '03L905061', 'Bougie de préchauffage', 'engine', 'Audi', 'A3 8V', 2012, 2020, '1.6 TDI', 95, 170),
            ('CPT-ABS-IBZ', '6Q0927807', 'Capteur ABS arrière', 'electrical', 'SEAT', 'Ibiza', 2017, 2023, '', 320, 520),
        ]
        parts = []
        for ref, oem, des, cat, brand, models_, yf, yt, eng, pa, pv in catalog:
            sup = suppliers[2] if cat == 'paint' else random.choice(suppliers[:2])
            # Demo parts carry no OEM reference: real references must come from a verified source (see OEM catalogue).
            p = Part.objects.create(reference=ref, oem_reference='', designation=des, category=cat, brand=brand,
                                    compatible_models=models_, year_from=yf, year_to=yt, engines=eng,
                                    compatibility_verified=False, purchase_price=pa, sale_price=pv, supplier=sup,
                                    quantity=0, min_quantity=random.choice([1, 2, 3]),
                                    location=f'R{random.randint(1, 6)}-E{random.randint(1, 4)}')
            StockMovement.objects.create(part=p, kind='in', quantity=random.choice([0, 1, 2, 4, 6, 10]) or 1, unit_cost=pa,
                                         supplier=sup, date=today - timedelta(days=60), reason='Stock initial')
            parts.append(p)
        Part.objects.filter(reference__in=['PHR-208-G', 'AMT-W205-AV']).update(quantity=0)

        clients, vehicles = [], []
        for i in range(24):
            company = i % 8 == 7
            c = Client.objects.create(
                kind='company' if company else 'individual', first_name='' if company else FIRST[i % 20],
                last_name=LAST[i % 20], company_name=f'{LAST[i % 20]} Transport SARL' if company else '',
                phone=f'06 {60 + i % 10} {10 + i:02d} {20 + i * 3 % 70:02d} {30 + i * 7 % 60:02d}',
                email=f'{LAST[i % 20].lower().replace(" ", "")}{i}@gmail.com', city=random.choice(CITIES),
                address=f'{random.randint(1, 200)} Bd {random.choice(["Zerktouni", "Anfa", "Mohammed V", "Ghandi", "Al Qods"])}',
                cin=f'B{random.randint(100000, 999999)}')
            clients.append(c)
            for _ in range(2 if i % 5 == 0 else 1):
                brand, model_, engine = random.choice(CARS)
                v = Vehicle.objects.create(
                    client=c, brand=brand, model=model_, engine=engine, year=random.randint(2013, 2024),
                    fuel='diesel' if 'd' in engine.lower() or 'TDI' in engine or 'HDi' in engine else 'petrol',
                    plate=f'{random.randint(10000, 99999)}-{random.choice("ABDHW")}-{random.choice([1, 6, 26, 40, 50])}',
                    vin=''.join(random.choices('ABCDEFGHJKLMNPRSTUVWXYZ0123456789', k=17)),
                    color=random.choice(COLORS), mileage=random.randint(20, 260) * 1000)
                vehicles.append(v)

        scenarios = ['closed', 'closed', 'closed', 'waiting_payment', 'delivered', 'done', 'quality_check', 'in_progress',
                     'in_progress', 'in_progress', 'waiting_parts', 'waiting_quote', 'waiting_insurance', 'expertise_done',
                     'waiting_expertise', 'waiting_expertise', 'waiting_documents', 'new', 'new', 'closed', 'in_progress', 'delivered']
        progress = [s for s, _ in RepairOrder.STATUS_CHOICES]
        for n, status in enumerate(scenarios):
            v = vehicles[n % len(vehicles)]
            insurance = n % 3 != 0 or status in ('waiting_expertise', 'expertise_done', 'waiting_insurance')
            rtype = random.choice(['body', 'paint', 'body']) if insurance else random.choice(['mechanical', 'electrical', 'mechanical', 'polish'])
            entry = today - timedelta(days=(len(scenarios) - n) * 6 + random.randint(0, 4))
            stage = progress.index(status)
            ro = RepairOrder.objects.create(
                client=v.client, vehicle=v, repair_type=rtype, status=status, entry_date=entry,
                expected_delivery_date=entry + timedelta(days=random.randint(5, 14)),
                delivered_at=entry + timedelta(days=10) if stage >= progress.index('delivered') else None,
                mileage_in=v.mileage, priority=random.choice(['normal', 'normal', 'high', 'urgent', 'low']),
                description={'body': 'Choc avant droit suite à accrochage : pare-chocs fissuré, aile enfoncée.',
                             'paint': 'Rayures profondes portière arrière gauche et bas de caisse.',
                             'mechanical': 'Bruit au freinage et voyant moteur allumé. Révision complète demandée.',
                             'electrical': 'Problème de démarrage intermittent, voyant batterie.',
                             'polish': 'Lustrage complet et rénovation des optiques.'}[rtype],
                is_insurance=insurance,
                insurance_company=random.choice(insurers) if insurance else None,
                claim_number=f'SIN-{today.year}-{random.randint(10000, 99999)}' if insurance else '',
                policy_number=f'POL{random.randint(1000000, 9999999)}' if insurance else '',
                accident_date=entry - timedelta(days=2) if insurance else None,
                accident_circumstances='Accrochage en stationnement, constat amiable signé.' if insurance else '',
                expert=random.choice(experts) if insurance and stage >= 3 else None,
                expertise_date=entry + timedelta(days=2) if insurance and stage >= 3 else None,
                insurance_step=min(8, stage + 1) if insurance else 1,
            )
            ro.employees.set(random.sample(workers, 2))
            if n % 4 == 0:
                ro.notes = 'Client souhaite être prévenu par téléphone avant tout travail supplémentaire.'
                ro.save()

            # Quote
            if stage >= progress.index('expertise_done') or not insurance and stage >= 1:
                compatible = [p for p in parts if p.brand in ('', v.brand)] or parts
                q = Quote.objects.create(repair_order=ro, kind='insurance' if insurance else 'estimate', date=entry + timedelta(days=1),
                                         valid_until=entry + timedelta(days=31),
                                         status='accepted' if stage > progress.index('waiting_quote') else 'pending')
                pos = 0
                for p in random.sample(compatible, min(len(compatible), random.randint(2, 4))):
                    QuoteLine.objects.create(quote=q, position=pos, line_type='part', part=p, reference=p.reference,
                                             designation=p.designation, quantity=1, unit_price=p.sale_price,
                                             operation='replace_new' if p.category != 'paint' else '')
                    pos += 1
                services = {'body': [('Démontage / remontage', 450), ('Redressage carrosserie', 900), ('Peinture 2 éléments', 1600)],
                            'paint': [('Préparation peinture', 500), ('Peinture et vernis', 1400), ('Polissage finition', 350)],
                            'mechanical': [("Main-d'œuvre mécanique (3h)", 600), ('Diagnostic valise', 250)],
                            'electrical': [('Diagnostic électrique', 300), ('Contrôle circuit de charge', 200)],
                            'polish': [('Lustrage complet', 800), ('Rénovation optiques', 300)]}[rtype]
                for label, price in services:
                    QuoteLine.objects.create(quote=q, position=pos, line_type='service', designation=label, quantity=1,
                                             unit_price=price, operation='labor' if rtype == 'mechanical' else 'repair')
                    pos += 1
                q.refresh_cache()
                if insurance:
                    ro.insurance_estimated_amount = q.total_ttc_cache
                    ro.insurance_approved_amount = (q.total_ttc_cache * Decimal('0.92')).quantize(Decimal('1')) if q.status == 'accepted' else 0
                    ro.deductible = Decimal('500') if q.status == 'accepted' else 0
                ro.estimated_cost = q.total_ttc_cache
                ro.save()

                if q.status == 'accepted':
                    for line in q.lines.filter(line_type='part'):
                        if line.part and line.part.quantity > 0:
                            StockMovement.objects.create(part=line.part, kind='out', quantity=1, repair_order=ro,
                                                         unit_cost=line.part.purchase_price, date=entry + timedelta(days=3),
                                                         reason=f'Sortie pour {ro.number}')
                            line.part.refresh_from_db()

                # Invoice + payments
                if stage >= progress.index('done'):
                    inv = invoice_from_quote(q)
                    inv.status = 'issued'
                    inv.date = entry + timedelta(days=9)
                    inv.due_date = inv.date + timedelta(days=30 if n != 3 else 5)
                    inv.save()
                    inv.refresh_status()
                    client_part = inv.total_ttc_cache - inv.insurance_amount
                    if status in ('closed', 'delivered') or n == 5:
                        Payment.objects.create(client=ro.client, repair_order=ro, invoice=inv, kind='deposit', method='cash',
                                               amount=(client_part * Decimal('0.3')).quantize(Decimal('1')), date=entry + timedelta(days=1))
                    if status == 'closed':
                        Payment.objects.create(client=ro.client, repair_order=ro, invoice=inv, method=random.choice(['cash', 'transfer']),
                                               amount=client_part - (client_part * Decimal('0.3')).quantize(Decimal('1')),
                                               date=inv.date, reference=f'VIR{random.randint(100000, 999999)}')
                        if inv.insurance_amount:
                            Payment.objects.create(client=ro.client, repair_order=ro, invoice=inv, origin='insurance', method='transfer',
                                                   amount=inv.insurance_amount, date=inv.date + timedelta(days=12),
                                                   reference=f'ASS-{random.randint(10000, 99999)}', bank='Attijariwafa Bank')
                    if status == 'delivered':
                        Payment.objects.create(client=ro.client, repair_order=ro, invoice=inv, method='cheque', cheque_status='pending',
                                               amount=client_part - (client_part * Decimal('0.3')).quantize(Decimal('1')),
                                               date=inv.date, bank='BMCE Bank of Africa', reference=f'CHQ {random.randint(1000000, 9999999)}',
                                               cheque_due_date=today + timedelta(days=random.randint(-1, 5)))
                    inv.refresh_status()

            # Tasks
            kinds = {'body': ['disassembly', 'straightening', 'paint_prep', 'paint', 'final_check'],
                     'paint': ['paint_prep', 'paint', 'polish', 'final_check'],
                     'mechanical': ['mechanical', 'final_check'], 'electrical': ['electrical', 'final_check'],
                     'polish': ['polish', 'final_check']}[rtype]
            if stage >= progress.index('waiting_parts'):
                labels = dict(RepairTask.KIND_CHOICES)
                for k_i, k in enumerate(kinds):
                    finished = stage >= progress.index('done') or (status in ('in_progress', 'quality_check') and k_i < len(kinds) // 2)
                    started = status in ('in_progress', 'quality_check') and k_i == len(kinds) // 2
                    RepairTask.objects.create(
                        repair_order=ro, kind=k, title=labels[k], employee=random.choice(workers),
                        status='done' if finished else 'in_progress' if started else 'todo',
                        start_date=entry + timedelta(days=2 + k_i), due_date=entry + timedelta(days=3 + k_i * 2),
                        completed_at=entry + timedelta(days=3 + k_i * 2) if finished else None,
                        hours_spent=Decimal(random.choice([1, 2, 3, 4])) if finished or started else 0)

        for workbook in sorted(Path(settings.BASE_DIR, 'data', 'oem').glob('*.xlsx')):
            call_command('import_oem', str(workbook), stdout=self.stdout)

        self.stdout.write(self.style.SUCCESS(
            f'{Client.objects.count()} clients, {Vehicle.objects.count()} véhicules, {RepairOrder.objects.count()} dossiers, '
            f'{Quote.objects.count()} devis, {Invoice.objects.count()} factures, {Payment.objects.count()} paiements.'))
