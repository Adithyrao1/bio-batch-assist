"""
Management command: seed_fieldlink

Seeds realistic 3-year seed multiplication data into all FieldLink tables.
Safe to run multiple times â€” clears old FieldLink data first.

Usage:
    py manage.py seed_fieldlink
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    User, Variety,
    FieldLocation, Plot, Farmer,
    SeedLot, SeedLotTransaction
)


class Command(BaseCommand):
    help = "Seed FieldLink tables with 3-year realistic mock data"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Clearing existing FieldLink data..."))
        with transaction.atomic():
            SeedLotTransaction.objects.all().delete()
            SeedLot.objects.all().delete()
            Farmer.objects.all().delete()
            Plot.objects.all().delete()
            FieldLocation.objects.all().delete()

        self.stdout.write(self.style.WARNING("Seeding fresh FieldLink data..."))

        # Get admin user and variety
        admin = User.objects.filter(is_superuser=True).first()
        if not admin:
            admin = User.objects.first()
        if not admin:
            self.stdout.write(self.style.ERROR("No users found. Create a superuser first."))
            return

        variety, _ = Variety.objects.get_or_create(
            code="SC-001", defaults={"name": "Sugarcane Co 86032"}
        )
        variety2, _ = Variety.objects.get_or_create(
            code="SC-002", defaults={"name": "Sugarcane Co 0238"}
        )

        # â”€â”€ LOCATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        loc_data = [
            ("Ajbapur", "company_farm", "Lakhimpur Kheri"),
            ("Rupapur", "company_farm", "Lakhimpur Kheri"),
            ("Hariawan", "contract_farm", "Sitapur"),
            ("Loni",    "contract_farm", "Barabanki"),
            ("Gola",    "contract_farm", "Lakhimpur Kheri"),
        ]
        locs = {}
        for name, ltype, district in loc_data:
            loc = FieldLocation.objects.create(
                name=name, location_type=ltype, district=district, state="Uttar Pradesh"
            )
            locs[name] = loc
            self.stdout.write(f"  âœ” Location: {name}")

        # â”€â”€ PLOTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        plot_data = [
            ("Ajbapur", "A-01", 2.5), ("Ajbapur", "A-02", 3.0), ("Ajbapur", "A-03", 1.8),
            ("Rupapur", "R-01", 4.0), ("Rupapur", "R-02", 2.2),
            ("Hariawan", "H-01", 5.5), ("Hariawan", "H-02", 4.8),
            ("Loni",   "L-01", 6.0), ("Loni", "L-02", 5.2),
            ("Gola",   "G-01", 3.8),
        ]
        plots = {}
        for loc_name, num, area in plot_data:
            p = Plot.objects.create(location=locs[loc_name], plot_number=num, area_acres=area)
            plots[f"{loc_name}-{num}"] = p

        # â”€â”€ FARMERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        farmer_data = [
            ("Ram Singh",    "Hariawan", "9876543210", locs["Hariawan"], 8.5),
            ("Amit Verma",   "Lakhimpur","9823456789", locs["Ajbapur"],  9.0),
            ("Suresh Kumar", "Sitapur",  "9812345678", locs["Hariawan"], 7.8),
            ("Rajesh Yadav", "Barabanki","9845678901", locs["Loni"],     8.2),
            ("Vijay Pandey", "Gola",     "9867890123", locs["Gola"],     7.5),
            ("Dinesh Tiwari","Rupapur",  "9856789012", locs["Rupapur"],  8.8),
        ]
        farmers = {}
        for name, village, phone, loc, score in farmer_data:
            f = Farmer.objects.create(
                name=name, village=village, phone=phone,
                primary_location=loc, quality_score=score, is_active=True
            )
            farmers[name] = f
            self.stdout.write(f"  âœ” Farmer: {name}")

        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # YEAR 1 â€” 2024: BREEDER SEED (2 lots, Company Farm)
        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        br1 = SeedLot.objects.create(
            lot_id="BR-2024-001", stage="breeder", variety=variety,
            quantity_kg=50, season_year=2024, status="harvested",
            location=locs["Ajbapur"], plot=plots["Ajbapur-A-01"],
            lab_batch_reference="TC-2023-045",
            notes="First breeder batch from LabNest TC run, Ajbapur company plot.",
            created_by=admin,
        )
        br2 = SeedLot.objects.create(
            lot_id="BR-2024-002", stage="breeder", variety=variety2,
            quantity_kg=40, season_year=2024, status="harvested",
            location=locs["Rupapur"], plot=plots["Rupapur-R-01"],
            lab_batch_reference="TC-2023-051",
            notes="Second breeder batch, CO 0238 variety.",
            created_by=admin,
        )
        self.stdout.write("  âœ” Breeder lots: BR-2024-001, BR-2024-002")

        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # YEAR 2 â€” 2025: FOUNDATION SEED (4 lots from 2 breeders)
        # Multiplication: ~1 breeder â†’ 600 kg foundation (12x ratio)
        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        fd1 = SeedLot.objects.create(
            lot_id="FD-2025-001", stage="foundation", variety=variety,
            parent_lot=br1, quantity_kg=580, season_year=2025, status="harvested",
            location=locs["Hariawan"], farmer=farmers["Ram Singh"], plot=plots["Hariawan-H-01"],
            notes="Foundation from BR-2024-001. Ram Singh plot H-01.",
            created_by=admin,
        )
        fd2 = SeedLot.objects.create(
            lot_id="FD-2025-002", stage="foundation", variety=variety,
            parent_lot=br1, quantity_kg=520, season_year=2025, status="harvested",
            location=locs["Loni"], farmer=farmers["Rajesh Yadav"], plot=plots["Loni-L-01"],
            notes="Foundation from BR-2024-001. Rajesh Yadav plot L-01.",
            created_by=admin,
        )
        fd3 = SeedLot.objects.create(
            lot_id="FD-2025-003", stage="foundation", variety=variety2,
            parent_lot=br2, quantity_kg=470, season_year=2025, status="harvested",
            location=locs["Hariawan"], farmer=farmers["Suresh Kumar"], plot=plots["Hariawan-H-02"],
            notes="Foundation from BR-2024-002, CO 0238.",
            created_by=admin,
        )
        fd4 = SeedLot.objects.create(
            lot_id="FD-2025-004", stage="foundation", variety=variety2,
            parent_lot=br2, quantity_kg=450, season_year=2025, status="harvested",
            location=locs["Gola"], farmer=farmers["Vijay Pandey"], plot=plots["Gola-G-01"],
            notes="Foundation from BR-2024-002, CO 0238.",
            created_by=admin,
        )
        self.stdout.write("  âœ” Foundation lots: FD-2025-001 to FD-2025-004")

        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # YEAR 3 â€” 2026: CERTIFIED SEED (6 lots, ~10x from foundation)
        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        ct1 = SeedLot.objects.create(
            lot_id="CT-2026-001", stage="certified", variety=variety,
            parent_lot=fd1, quantity_kg=5500, season_year=2026, status="in_field",
            location=locs["Hariawan"], farmer=farmers["Ram Singh"],
            notes="Certified from FD-2025-001.",
            created_by=admin,
        )
        ct2 = SeedLot.objects.create(
            lot_id="CT-2026-002", stage="certified", variety=variety,
            parent_lot=fd1, quantity_kg=4900, season_year=2026, status="dispatched",
            location=locs["Loni"], farmer=farmers["Rajesh Yadav"],
            notes="Certified from FD-2025-001. Dispatched to Rajesh.",
            created_by=admin,
        )
        ct3 = SeedLot.objects.create(
            lot_id="CT-2026-003", stage="certified", variety=variety,
            parent_lot=fd2, quantity_kg=5200, season_year=2026, status="in_field",
            location=locs["Loni"], farmer=farmers["Rajesh Yadav"],
            notes="Certified from FD-2025-002.",
            created_by=admin,
        )
        ct4 = SeedLot.objects.create(
            lot_id="CT-2026-004", stage="certified", variety=variety2,
            parent_lot=fd3, quantity_kg=4600, season_year=2026, status="dispatched",
            location=locs["Hariawan"], farmer=farmers["Suresh Kumar"],
            notes="Certified from FD-2025-003, CO 0238.",
            created_by=admin,
        )
        ct5 = SeedLot.objects.create(
            lot_id="CT-2026-005", stage="certified", variety=variety2,
            parent_lot=fd4, quantity_kg=4400, season_year=2026, status="in_field",
            location=locs["Gola"], farmer=farmers["Vijay Pandey"],
            notes="Certified from FD-2025-004.",
            created_by=admin,
        )
        ct6 = SeedLot.objects.create(
            lot_id="CT-2026-006", stage="certified", variety=variety2,
            parent_lot=fd4, quantity_kg=4100, season_year=2026, status="in_field",
            location=locs["Rupapur"], farmer=farmers["Dinesh Tiwari"],
            notes="Certified from FD-2025-004.",
            created_by=admin,
        )
        self.stdout.write("  âœ” Certified lots: CT-2026-001 to CT-2026-006")

        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # TRANSACTIONS (Audit ledger)
        # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        txn_records = [
            # Breeder dispatches
            (br1, "dispatch", 50,   farmers["Ram Singh"],    locs["Ajbapur"],  "Dispatch from Ajbapur nucleus plot"),
            (br2, "dispatch", 40,   farmers["Suresh Kumar"], locs["Rupapur"],  "Dispatch from Rupapur nucleus plot"),
            # Foundation harvests
            (br1, "harvest",  580,  farmers["Ram Singh"],    locs["Hariawan"], "Harvest from Ram Singh. New lot FD-2025-001"),
            (br1, "harvest",  520,  farmers["Rajesh Yadav"], locs["Loni"],     "Harvest from Rajesh. New lot FD-2025-002"),
            (br2, "harvest",  470,  farmers["Suresh Kumar"], locs["Hariawan"], "Harvest from Suresh. New lot FD-2025-003"),
            (br2, "harvest",  450,  farmers["Vijay Pandey"], locs["Gola"],     "Harvest from Vijay. New lot FD-2025-004"),
            # Foundation dispatches
            (fd1, "dispatch", 580,  farmers["Ram Singh"],    locs["Hariawan"], "Foundation dispatched for CT multiplication"),
            (fd2, "dispatch", 520,  farmers["Rajesh Yadav"], locs["Loni"],     "Foundation dispatched for CT multiplication"),
            (fd3, "dispatch", 470,  farmers["Suresh Kumar"], locs["Hariawan"], "Foundation dispatched for CT multiplication"),
            (fd4, "dispatch", 450,  farmers["Vijay Pandey"], locs["Gola"],     "Foundation dispatched for CT multiplication"),
            # Certified dispatches
            (ct2, "dispatch", 4900, farmers["Rajesh Yadav"], locs["Loni"],     "Certified lot dispatched for commercial planting"),
            (ct4, "dispatch", 4600, farmers["Suresh Kumar"], locs["Hariawan"], "Certified lot dispatched for commercial planting"),
        ]

        for lot, txn_type, qty, farmer_obj, loc_obj, notes in txn_records:
            SeedLotTransaction.objects.create(
                seed_lot=lot,
                txn_type=txn_type,
                quantity_kg=qty,
                farmer=farmer_obj,
                location=loc_obj,
                notes=notes,
                recorded_by=admin,
            )

        self.stdout.write("  âœ” Transactions seeded")

        # Summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write(self.style.SUCCESS("âœ…  FieldLink data seeded successfully!"))
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write(f"   Locations  : {FieldLocation.objects.count()}")
        self.stdout.write(f"   Plots      : {Plot.objects.count()}")
        self.stdout.write(f"   Farmers    : {Farmer.objects.count()}")
        self.stdout.write(f"   Seed Lots  : {SeedLot.objects.count()}")
        self.stdout.write(f"   Transactions: {SeedLotTransaction.objects.count()}")
        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("Lot hierarchy for Genealogy Tracer:"))
        self.stdout.write("   BR-2024-001 â†’ FD-2025-001, FD-2025-002 â†’ CT-2026-001, CT-2026-002, CT-2026-003")
        self.stdout.write("   BR-2024-002 â†’ FD-2025-003, FD-2025-004 â†’ CT-2026-004, CT-2026-005, CT-2026-006")
