"""
Seeds Chemical inventory and MediaChemicalRequirement records for the four standard
tissue culture media used in this application:

  - MS Medium  (Murashige & Skoog, 1962)
  - B5 Medium  (Gamborg, 1968)
  - White's Medium (White, 1963)
  - N6 Medium  (Chu, 1975)

All quantities are in g/L (grams per litre) unless the unit column says mg/L,
but since the Chemical model stores a single `unit` field we store quantities
at the same scale as the chemical unit.  Here everything is stored in g/L so
chemical unit = 'g'.

Run with:
    python manage.py seed_media_chemicals
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Chemical, MediaType, MediaChemicalRequirement


# ---------------------------------------------------------------------------
# Chemical master list: (name, unit)
# ---------------------------------------------------------------------------
CHEMICALS = [
    # Macronutrients
    ("Ammonium Nitrate (NH4NO3)",         "g"),
    ("Potassium Nitrate (KNO3)",           "g"),
    ("Calcium Chloride (CaCl2·2H2O)",     "g"),
    ("Magnesium Sulfate (MgSO4·7H2O)",    "g"),
    ("Potassium Phosphate Monobasic (KH2PO4)", "g"),
    ("Sodium Phosphate Dibasic (NaH2PO4·H2O)", "g"),
    ("Calcium Nitrate (Ca(NO3)2·4H2O)",   "g"),
    ("Potassium Sulfate (K2SO4)",          "g"),
    ("Ammonium Sulfate ((NH4)2SO4)",       "g"),
    # Micronutrients / trace elements (stored as g but values are mg scale → 0.00x)
    ("Manganese Sulfate (MnSO4·4H2O)",    "g"),
    ("Zinc Sulfate (ZnSO4·7H2O)",         "g"),
    ("Boric Acid (H3BO3)",                 "g"),
    ("Potassium Iodide (KI)",              "g"),
    ("Sodium Molybdate (Na2MoO4·2H2O)",   "g"),
    ("Cupric Sulfate (CuSO4·5H2O)",       "g"),
    ("Cobaltous Chloride (CoCl2·6H2O)",   "g"),
    # Iron source
    ("Ferrous Sulfate (FeSO4·7H2O)",      "g"),
    ("Disodium EDTA (Na2EDTA)",            "g"),
    # Organics / vitamins
    ("Inositol",                           "g"),
    ("Nicotinic Acid",                     "g"),
    ("Pyridoxine HCl",                     "g"),
    ("Thiamine HCl",                       "g"),
    ("Glycine",                            "g"),
    # Carbon source & gelling agent
    ("Sucrose",                            "g"),
    ("Agar",                               "g"),
]

# ---------------------------------------------------------------------------
# Media formulations: media_name → list of (chemical_name, qty_per_litre_g)
# ---------------------------------------------------------------------------
MS_MEDIUM = [
    ("Ammonium Nitrate (NH4NO3)",              1.6500),
    ("Potassium Nitrate (KNO3)",               1.9000),
    ("Calcium Chloride (CaCl2·2H2O)",          0.4400),
    ("Magnesium Sulfate (MgSO4·7H2O)",         0.3700),
    ("Potassium Phosphate Monobasic (KH2PO4)", 0.1700),
    ("Manganese Sulfate (MnSO4·4H2O)",         0.0222),
    ("Zinc Sulfate (ZnSO4·7H2O)",              0.0086),
    ("Boric Acid (H3BO3)",                     0.0062),
    ("Potassium Iodide (KI)",                  0.00083),
    ("Sodium Molybdate (Na2MoO4·2H2O)",        0.00025),
    ("Cupric Sulfate (CuSO4·5H2O)",            0.000025),
    ("Cobaltous Chloride (CoCl2·6H2O)",        0.000025),
    ("Ferrous Sulfate (FeSO4·7H2O)",           0.02784),
    ("Disodium EDTA (Na2EDTA)",                0.03724),
    ("Inositol",                               0.1000),
    ("Nicotinic Acid",                         0.0005),
    ("Pyridoxine HCl",                         0.0005),
    ("Thiamine HCl",                           0.0001),
    ("Glycine",                                0.0020),
    ("Sucrose",                               30.0000),
    ("Agar",                                   8.0000),
]

B5_MEDIUM = [
    ("Potassium Nitrate (KNO3)",               2.5000),
    ("Calcium Chloride (CaCl2·2H2O)",          0.1500),
    ("Magnesium Sulfate (MgSO4·7H2O)",         0.2500),
    ("Sodium Phosphate Dibasic (NaH2PO4·H2O)", 0.1500),
    ("Ammonium Sulfate ((NH4)2SO4)",           0.1340),
    ("Manganese Sulfate (MnSO4·4H2O)",         0.01000),
    ("Zinc Sulfate (ZnSO4·7H2O)",              0.00200),
    ("Boric Acid (H3BO3)",                     0.00300),
    ("Potassium Iodide (KI)",                  0.00075),
    ("Sodium Molybdate (Na2MoO4·2H2O)",        0.00025),
    ("Cupric Sulfate (CuSO4·5H2O)",            0.000025),
    ("Cobaltous Chloride (CoCl2·6H2O)",        0.000025),
    ("Ferrous Sulfate (FeSO4·7H2O)",           0.02784),
    ("Disodium EDTA (Na2EDTA)",                0.03724),
    ("Inositol",                               0.1000),
    ("Nicotinic Acid",                         0.0010),
    ("Pyridoxine HCl",                         0.0010),
    ("Thiamine HCl",                           0.0100),
    ("Sucrose",                               20.0000),
    ("Agar",                                   8.0000),
]

WHITES_MEDIUM = [
    ("Calcium Nitrate (Ca(NO3)2·4H2O)",        0.2000),
    ("Potassium Nitrate (KNO3)",               0.0800),
    ("Potassium Sulfate (K2SO4)",              0.0650),
    ("Magnesium Sulfate (MgSO4·7H2O)",         0.7200),
    ("Sodium Phosphate Dibasic (NaH2PO4·H2O)", 0.0190),
    ("Manganese Sulfate (MnSO4·4H2O)",         0.00700),
    ("Zinc Sulfate (ZnSO4·7H2O)",              0.00300),
    ("Boric Acid (H3BO3)",                     0.00150),
    ("Potassium Iodide (KI)",                  0.00075),
    ("Ferrous Sulfate (FeSO4·7H2O)",           0.00250),
    ("Inositol",                               0.1000),
    ("Nicotinic Acid",                         0.0005),
    ("Pyridoxine HCl",                         0.0001),
    ("Thiamine HCl",                           0.0001),
    ("Glycine",                                0.0030),
    ("Sucrose",                               20.0000),
    ("Agar",                                   8.0000),
]

N6_MEDIUM = [
    ("Ammonium Nitrate (NH4NO3)",              0.4630),
    ("Potassium Nitrate (KNO3)",               2.8300),
    ("Calcium Chloride (CaCl2·2H2O)",          0.1660),
    ("Magnesium Sulfate (MgSO4·7H2O)",         0.1850),
    ("Potassium Phosphate Monobasic (KH2PO4)", 0.4000),
    ("Ammonium Sulfate ((NH4)2SO4)",           0.4630),
    ("Manganese Sulfate (MnSO4·4H2O)",         0.00330),
    ("Zinc Sulfate (ZnSO4·7H2O)",              0.00150),
    ("Boric Acid (H3BO3)",                     0.00160),
    ("Potassium Iodide (KI)",                  0.00080),
    ("Ferrous Sulfate (FeSO4·7H2O)",           0.02784),
    ("Disodium EDTA (Na2EDTA)",                0.03724),
    ("Inositol",                               0.1000),
    ("Nicotinic Acid",                         0.0005),
    ("Pyridoxine HCl",                         0.0005),
    ("Thiamine HCl",                           0.0010),
    ("Glycine",                                0.0020),
    ("Sucrose",                               50.0000),
    ("Agar",                                   8.0000),
]

MEDIA_FORMULATIONS = {
    "MS Medium":     MS_MEDIUM,
    "B5 Medium":     B5_MEDIUM,
    "White's Medium": WHITES_MEDIUM,
    "N6 Medium":     N6_MEDIUM,
}


class Command(BaseCommand):
    help = "Seed chemicals and media chemical requirements for all standard tissue culture media"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding chemicals...")

        # --- 1. Ensure all chemicals exist ---
        chem_map: dict[str, Chemical] = {}
        for name, unit in CHEMICALS:
            chem, created = Chemical.objects.get_or_create(
                name=name,
                defaults={
                    "quantity": 0,
                    "unit": unit,
                    "mfg_date": "2026-01-01",
                    "expiry_date": "2028-01-01",
                    "received_date": "2026-01-01",
                    "remaining_stock": 500,
                }
            )
            chem_map[name] = chem
            if created:
                self.stdout.write(f"  Created chemical: {name}")
            else:
                self.stdout.write(f"  Already exists:  {name}")

        self.stdout.write("\nSeeding media chemical requirements...")

        # --- 2. Seed requirements per media type ---
        for media_name, formulation in MEDIA_FORMULATIONS.items():
            try:
                media_type = MediaType.objects.get(name=media_name)
            except MediaType.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Media type not found, skipping: {media_name}"))
                continue

            self.stdout.write(f"\n  {media_name}:")
            for chem_name, qty in formulation:
                chem = chem_map.get(chem_name)
                if not chem:
                    self.stdout.write(self.style.WARNING(f"    Chemical not found: {chem_name}"))
                    continue

                req, created = MediaChemicalRequirement.objects.update_or_create(
                    media_type=media_type,
                    chemical=chem,
                    defaults={"quantity_required": qty},
                )
                action = "Created" if created else "Updated"
                self.stdout.write(f"    {action}: {chem_name} → {qty} g/L")

        self.stdout.write(self.style.SUCCESS("\nDone! All media chemical requirements seeded."))
