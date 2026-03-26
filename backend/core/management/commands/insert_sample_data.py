from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal
from core.models import (
    User, Area, Variety, MediaType, FindingType,
    Chemical, MediaPreparation, ContaminationMonitoring,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse
)


class Command(BaseCommand):
    help = 'Insert sample data for sugarcane tissue culture lab'

    def handle(self, *args, **options):
        self.stdout.write('Inserting sample data...')
        
        # Get reference data
        users = list(User.objects.filter(role__in=['admin', 'technician']))
        areas = list(Area.objects.all())
        varieties = list(Variety.objects.all())
        media_types = list(MediaType.objects.all())
        finding_types = list(FindingType.objects.all())
        
        if not users:
            self.stdout.write(self.style.ERROR('No users found. Run seed_data first.'))
            return
        
        today = timezone.now().date()
        
        # ============================================
        # CHEMICALS - Common tissue culture chemicals
        # ============================================
        chemicals_data = [
            {'name': 'Murashige & Skoog (MS) Basal Salt', 'quantity': 500, 'unit': 'g', 'remaining': 320},
            {'name': 'Sucrose (Tissue Culture Grade)', 'quantity': 5000, 'unit': 'g', 'remaining': 3200},
            {'name': 'Agar (Plant TC Grade)', 'quantity': 1000, 'unit': 'g', 'remaining': 680},
            {'name': 'BAP (6-Benzylaminopurine)', 'quantity': 25, 'unit': 'g', 'remaining': 18},
            {'name': 'NAA (1-Naphthaleneacetic acid)', 'quantity': 10, 'unit': 'g', 'remaining': 7.5},
            {'name': 'Kinetin', 'quantity': 5, 'unit': 'g', 'remaining': 3.2},
            {'name': 'IBA (Indole-3-butyric acid)', 'quantity': 10, 'unit': 'g', 'remaining': 6.8},
            {'name': 'Activated Charcoal', 'quantity': 500, 'unit': 'g', 'remaining': 420},
            {'name': 'Myo-inositol', 'quantity': 100, 'unit': 'g', 'remaining': 72},
            {'name': 'Thiamine HCl (Vitamin B1)', 'quantity': 25, 'unit': 'g', 'remaining': 19},
            {'name': 'Pyridoxine HCl (Vitamin B6)', 'quantity': 10, 'unit': 'g', 'remaining': 8.5},
            {'name': 'Nicotinic Acid', 'quantity': 25, 'unit': 'g', 'remaining': 21},
            {'name': 'Glycine', 'quantity': 50, 'unit': 'g', 'remaining': 38},
            {'name': 'Sodium Hypochlorite (Bleach)', 'quantity': 5, 'unit': 'L', 'remaining': 3.2},
            {'name': 'Ethanol 70%', 'quantity': 20, 'unit': 'L', 'remaining': 12},
            {'name': 'Mercuric Chloride', 'quantity': 100, 'unit': 'g', 'remaining': 85},
            {'name': 'Tween 20', 'quantity': 500, 'unit': 'mL', 'remaining': 380},
            {'name': 'Coconut Water', 'quantity': 10, 'unit': 'L', 'remaining': 4},
        ]
        
        for chem in chemicals_data:
            mfg_date = today - timedelta(days=random.randint(60, 365))
            expiry_date = mfg_date + timedelta(days=random.randint(365, 730))
            received_date = mfg_date + timedelta(days=random.randint(5, 30))
            
            Chemical.objects.get_or_create(
                name=chem['name'],
                defaults={
                    'quantity': Decimal(str(chem['quantity'])),
                    'unit': chem['unit'],
                    'mfg_date': mfg_date,
                    'expiry_date': expiry_date,
                    'received_date': received_date,
                    'remaining_stock': Decimal(str(chem['remaining'])),
                }
            )
        self.stdout.write(f'  Created {len(chemicals_data)} chemicals')
        
        # ============================================
        # MEDIA PREPARATION - Last 60 days batches
        # ============================================
        media_count = 0
        for i in range(25):
            prep_date = today - timedelta(days=random.randint(1, 60))
            batch_num = f"MP-{prep_date.strftime('%Y%m%d')}-{i+1:02d}"
            
            if not MediaPreparation.objects.filter(batch_number=batch_num).exists():
                bottles_prepared = random.randint(20, 80)
                bottles_issued = random.randint(0, bottles_prepared)
                
                MediaPreparation.objects.create(
                    batch_number=batch_num,
                    media_type=random.choice(media_types),
                    prep_date=prep_date,
                    quantity=Decimal(str(random.randint(1, 5))),
                    bottles_prepared=bottles_prepared,
                    prepared_by=random.choice(users),
                    contamination_notes=random.choice(['', '', '', 'Minor fungal growth observed', 'Clear']),
                    bottles_issued=bottles_issued,
                    issued_date=prep_date + timedelta(days=random.randint(1, 3)) if bottles_issued > 0 else None,
                )
                media_count += 1
        self.stdout.write(f'  Created {media_count} media preparation batches')
        
        # ============================================
        # CONTAMINATION MONITORING - Weekly checks
        # ============================================
        contam_count = 0
        for week in range(12):  # Last 12 weeks
            check_date = today - timedelta(weeks=week)
            for area in areas:
                if random.random() < 0.7:  # 70% chance of having a check per area per week
                    colony_count = random.choices(
                        [0, 1, 2, 3, 5, 8, 12],
                        weights=[40, 25, 15, 10, 5, 3, 2]
                    )[0]
                    
                    if colony_count == 0:
                        colony_type = 'None'
                        action = 'No action required - area clean'
                    else:
                        colony_type = random.choice(['Fungal', 'Bacterial', 'Yeast'])
                        action = random.choice([
                            'UV sterilization for 30 minutes',
                            'Deep cleaning with 70% ethanol',
                            'Fumigation scheduled',
                            'Surface disinfection completed',
                            'HEPA filter checked and cleaned',
                        ])
                    
                    ContaminationMonitoring.objects.create(
                        date_time=timezone.make_aware(
                            timezone.datetime.combine(check_date, timezone.datetime.min.time())
                        ) + timedelta(hours=random.randint(8, 16)),
                        area=area,
                        plates_exposed=random.randint(3, 6),
                        observation_datetime=timezone.make_aware(
                            timezone.datetime.combine(check_date + timedelta(days=2), timezone.datetime.min.time())
                        ),
                        colony_count=colony_count,
                        colony_type=colony_type,
                        action_taken=action,
                        recorded_by=random.choice(users),
                    )
                    contam_count += 1
        self.stdout.write(f'  Created {contam_count} contamination monitoring records')
        
        # ============================================
        # CONTAMINATION REPORTS - Incidents
        # ============================================
        report_count = 0
        contamination_sources = ['Fungus', 'Bacteria']
        contamination_types = [
            'Aspergillus sp. contamination',
            'Penicillium sp. growth',
            'Bacterial soft rot',
            'Yeast contamination',
            'Unknown fungal growth',
            'Bacterial turbidity in media',
        ]
        
        for i in range(15):
            report_date = today - timedelta(days=random.randint(1, 90))
            ContaminationReport.objects.create(
                variety=random.choice(varieties),
                source=random.choice(contamination_sources),
                type_desc=random.choice(contamination_types),
                bottles_affected=random.randint(2, 15),
                operator=random.choice(users),
                date=report_date,
                notes=random.choice([
                    'Contamination detected during routine inspection',
                    'Reported by technician during subculturing',
                    'Found during growth room inventory',
                    'Detected after 48 hours incubation',
                    '',
                ]),
            )
            report_count += 1
        self.stdout.write(f'  Created {report_count} contamination reports')
        
        # ============================================
        # INOCULATION ROOM - Daily production
        # ============================================
        inoc_count = 0
        for day in range(60):  # Last 60 days
            work_date = today - timedelta(days=day)
            # Skip some Sundays
            if work_date.weekday() == 6 and random.random() < 0.7:
                continue
            
            # 1-3 varieties processed per day
            for variety in random.sample(varieties, k=random.randint(1, 3)):
                cultures = random.randint(50, 200)
                bottles = random.randint(20, 60)
                
                InoculationRoom.objects.create(
                    variety=variety,
                    date=work_date,
                    operator=random.choice(users),
                    cultures=cultures,
                    bottles=bottles,
                    total_produced=cultures + (bottles * 5),
                    remarks=random.choice([
                        '',
                        'Good multiplication rate',
                        'Healthy explants',
                        'Slight browning observed',
                        'Excellent shoot proliferation',
                        'Normal growth pattern',
                        '',
                    ]),
                )
                inoc_count += 1
        self.stdout.write(f'  Created {inoc_count} inoculation records')
        
        # ============================================
        # GROWTH ROOM - Daily inventory tracking
        # ============================================
        growth_count = 0
        for day in range(45):  # Last 45 days
            work_date = today - timedelta(days=day)
            
            for variety in varieties:
                if random.random() < 0.6:  # Not all varieties every day
                    opening_bottles = random.randint(30, 150)
                    opening_cultures = opening_bottles * random.randint(4, 8)
                    
                    issued_bottles = random.randint(0, min(20, opening_bottles))
                    issued_cultures = issued_bottles * random.randint(4, 6)
                    
                    received_bottles = random.randint(0, 30)
                    received_cultures = received_bottles * random.randint(5, 8)
                    
                    contaminated_bottles = random.choices([0, 1, 2, 3, 5], weights=[50, 25, 15, 7, 3])[0]
                    contaminated_cultures = contaminated_bottles * random.randint(4, 6)
                    
                    closing_bottles = opening_bottles - issued_bottles + received_bottles - contaminated_bottles
                    closing_cultures = opening_cultures - issued_cultures + received_cultures - contaminated_cultures
                    
                    GrowthRoom.objects.create(
                        variety=variety,
                        ltd_date=work_date,
                        planning=random.choice(['Subculture', 'Multiplication', 'Rooting', 'Maintenance']),
                        opening_bottles=opening_bottles,
                        opening_cultures=opening_cultures,
                        issued_bottles=issued_bottles,
                        issued_cultures=issued_cultures,
                        received_bottles=received_bottles,
                        received_cultures=received_cultures,
                        contaminated_bottles=contaminated_bottles,
                        contaminated_cultures=contaminated_cultures,
                        closing_bottles=max(0, closing_bottles),
                        closing_cultures=max(0, closing_cultures),
                        recorded_by=random.choice(users),
                    )
                    growth_count += 1
        self.stdout.write(f'  Created {growth_count} growth room records')
        
        # ============================================
        # GREENHOUSE - Hardening operations
        # ============================================
        greenhouse_count = 0
        operations = [
            'Primary hardening',
            'Secondary hardening',
            'Misting adjustment',
            'Shade reduction',
            'Fertilizer application',
            'Pest inspection',
            'Transplanting to poly bags',
        ]
        
        for i in range(30):
            transplant_date = today - timedelta(days=random.randint(14, 90))
            operation_date = transplant_date + timedelta(days=random.randint(1, 30))
            observation_date = operation_date + timedelta(days=random.randint(1, 7))
            
            batch_num = f"GH-{transplant_date.strftime('%Y%m%d')}-{random.randint(1, 5):02d}"
            
            gh = Greenhouse.objects.create(
                variety=random.choice(varieties),
                batch_number=batch_num,
                transplant_date=transplant_date,
                operation_date=operation_date,
                operation_desc=random.choice(operations),
                observation_date=observation_date,
                plantlets_died=random.choices([0, 1, 2, 3, 5, 8], weights=[40, 25, 15, 10, 7, 3])[0],
                recorded_by=random.choice(users),
            )
            
            # Add findings (1-3 random findings)
            selected_findings = random.sample(finding_types, k=random.randint(1, 3))
            gh.findings.set(selected_findings)
            
            greenhouse_count += 1
        self.stdout.write(f'  Created {greenhouse_count} greenhouse records')
        
        self.stdout.write(self.style.SUCCESS('Sample data inserted successfully!'))
