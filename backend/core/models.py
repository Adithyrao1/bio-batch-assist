from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# ============================================
# USER MODEL
# ============================================
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('technician', 'Technician'),
        ('viewer', 'Viewer'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    is_onboarded = models.BooleanField(
        default=False,
        help_text="Set to True after the user selects their role on first login."
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


# ============================================
# MASTER DATA / REFERENCE TABLES
# ============================================



class Variety(models.Model):
    code = models.CharField(max_length=20, unique=True)  # e.g., SC-001 (LabNest code)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    field_code = models.CharField(
        max_length=50, blank=True, default='',
        help_text="FieldLink variety code / alias used in the seed multiplication program"
    )

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        verbose_name_plural = "Varieties"
        ordering = ['code']



class StockSolution(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    base_volume = models.DecimalField(max_digits=10, decimal_places=2, default=1.0)
    remaining_volume = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    unit = models.CharField(max_length=20, default='mL')

    def __str__(self):
        return f"{self.name} (Base: {self.base_volume} {self.unit}, Remaining: {self.remaining_volume} {self.unit})"

    class Meta:
        ordering = ['name']


# ============================================
# OPERATIONAL TABLES
# ============================================
class Chemical(models.Model):
    name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    mfg_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    received_date = models.DateField(null=True, blank=True)
    remaining_stock = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Cost per unit")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.remaining_stock} {self.unit})"
    
    @property
    def is_expired(self):
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False
    
    class Meta:
        ordering = ['name']


# ============================================
# PRODUCTION TRACKING MODELS
# ============================================
class DailyProductionLog(models.Model):
    date = models.DateField(default=timezone.now)
    technician = models.ForeignKey('User', on_delete=models.PROTECT)
    variety = models.ForeignKey(Variety, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-date']

class InitiationLog(DailyProductionLog):
    bottles_inoculated = models.IntegerField(default=0, help_text="Meristem Tissue Inoculated (No. of Bottles)")
    contaminated_bottles = models.IntegerField(default=0, help_text="Contaminated Tubes (Nos)")

    def __str__(self):
        return f"Initiation - {self.variety.code} - {self.date}"

class MultiplicationLog(DailyProductionLog):
    CYCLE_CHOICES = [
        (1, 'Ist'),
        (2, 'IInd'),
        (3, 'IIIrd'),
        (4, 'IVth'),
        (5, 'Vth'),
    ]
    cycle_number = models.IntegerField(choices=CYCLE_CHOICES)
    bottles_produced = models.IntegerField(default=0, help_text="No. of Bottles")
    contaminated_bottles = models.IntegerField(default=0, help_text="Contaminated Bottles (Nos)")

    def __str__(self):
        return f"Multiplication (Cycle {self.cycle_number}) - {self.variety.code} - {self.date}"

class RootingLog(DailyProductionLog):
    basal_bottles = models.IntegerField(default=0, help_text="Basal (No. of Bottles)")
    rooting_bottles = models.IntegerField(default=0, help_text="Rooting (No. of Bottles)")
    contaminated_bottles = models.IntegerField(default=0, help_text="Contaminated Bottles (Nos)")

    def __str__(self):
        return f"Rooting - {self.variety.code} - {self.date}"

class HardeningLog(DailyProductionLog):
    seedlings_transplanted = models.IntegerField(default=0, help_text="Seedling Transplant in Green House (Nos)")
    seedlings_died = models.IntegerField(default=0, help_text="Seedling Dried in Green House (Nos)")

    def __str__(self):
        return f"Hardening - {self.variety.code} - {self.date}"

class TransplantationLog(DailyProductionLog):
    seedlings_transplanted = models.IntegerField(default=0, help_text="Seedling Transplant in Field (Nos)")
    seedlings_died = models.IntegerField(default=0, help_text="Seedling Dried in Field (Nos)")
    field_lot_id = models.CharField(max_length=50, blank=True, help_text="Optional: Automatically create a FieldLink Breeder Lot with this ID")
    farmer = models.ForeignKey('Farmer', on_delete=models.SET_NULL, null=True, blank=True, related_name='transplantation_logs')
    location = models.ForeignKey('FieldLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='transplantation_logs')

    def __str__(self):
        return f"Transplantation - {self.variety.code} - {self.date}"
    
class RecentActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recent_activities')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"


# ============================================
# STOCK SOLUTION RECIPE & USAGE
# ============================================

class StockSolutionRecipeItem(models.Model):
    """Defines how much of a chemical is needed per unit of a given stock solution."""
    stock_solution = models.ForeignKey(StockSolution, on_delete=models.CASCADE, related_name='recipe_items')
    chemical = models.ForeignKey(Chemical, on_delete=models.PROTECT, related_name='stock_recipes')
    quantity_per_unit = models.DecimalField(
        max_digits=10, decimal_places=4,
        help_text='Amount of chemical required per unit of stock solution (in chemical\'s own unit)'
    )

    class Meta:
        unique_together = [['stock_solution', 'chemical']]
        ordering = ['stock_solution', 'chemical']

    def __str__(self):
        return f"{self.stock_solution.name} → {self.chemical.name} ({self.quantity_per_unit}/unit)"


class StockSolutionPreparation(models.Model):
    stock_solution = models.ForeignKey(StockSolution, on_delete=models.PROTECT, related_name='preparations')
    volume_prepared = models.DecimalField(max_digits=10, decimal_places=2)
    prepared_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='stock_preparations')
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.stock_solution.name} - {self.volume_prepared} {self.stock_solution.unit} ({self.date})"
    
    class Meta:
        ordering = ['-date', '-created_at']

class StockSolutionChemicalUsage(models.Model):
    """Immutable audit record created whenever chemicals are deducted for a stock solution preparation."""
    preparation = models.ForeignKey(StockSolutionPreparation, on_delete=models.CASCADE, related_name='chemical_usages')
    chemical = models.ForeignKey(Chemical, on_delete=models.PROTECT, related_name='stock_usage_logs')
    quantity_consumed = models.DecimalField(max_digits=10, decimal_places=4)
    
    def __str__(self):
        return f"{self.chemical.name} — {self.quantity_consumed} for {self.preparation}"

# ============================================
# EXPENSE TRACKING
# ============================================

class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Expense Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class Expense(models.Model):
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, related_name='expenses')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(default=timezone.now)
    description = models.TextField(blank=True)
    invoice_reference = models.CharField(max_length=100, blank=True)
    recorded_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='recorded_expenses')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.category.name} - ${self.amount} on {self.date}"


# ============================================
# MANPOWER EXPENSE (TECHNICIAN SALARIES)
# ============================================
class ManpowerExpense(models.Model):
    """
    Stores the current monthly salary for a technician.
    One record per technician (unique). Admin updates when salary changes.
    Daily rate = monthly_salary / 30, used to pro-rate cost per plantlet.
    """
    technician = models.OneToOneField(
        'User',
        on_delete=models.PROTECT,
        related_name='salary_record',
        limit_choices_to={'role': 'technician'},
    )
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        'User',
        on_delete=models.PROTECT,
        related_name='recorded_salaries',
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['technician']
        verbose_name = 'Manpower Expense'
        verbose_name_plural = 'Manpower Expenses'

    @property
    def daily_rate(self):
        """Daily cost rate derived from monthly salary."""
        return round(float(self.monthly_salary) / 30, 4)

    def __str__(self):
        return f"{self.technician.get_full_name() or self.technician.username} — ₹{self.monthly_salary}/month"


# ============================================
# FIELDLINK — SEED TRACEABILITY MODULE
# ============================================

class FieldLocation(models.Model):
    """A named geographic area (e.g. Ajbapur, Rupapur) that contains plots."""
    TYPE_CHOICES = [
        ('company_farm', 'Company Farm'),
        ('contract_farm', 'Contract Farm'),
    ]
    name = models.CharField(max_length=100, unique=True)
    location_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='company_farm')
    district = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, default='Uttar Pradesh')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Field Location'

    def __str__(self):
        return self.name


class Plot(models.Model):
    """A specific plot of land within a FieldLocation."""
    location = models.ForeignKey(FieldLocation, on_delete=models.PROTECT, related_name='plots')
    plot_number = models.CharField(max_length=30)
    area_acres = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    notes = models.TextField(blank=True)
    # Geo-spatial fields
    boundaries = models.JSONField(
        null=True, blank=True,
        help_text="GeoJSON polygon representing the plot boundary."
    )
    centroid_lat = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text="Latitude of the plot center point."
    )
    centroid_lng = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text="Longitude of the plot center point."
    )

    class Meta:
        unique_together = [['location', 'plot_number']]
        ordering = ['location', 'plot_number']

    def __str__(self):
        return f"{self.location.name} — Plot {self.plot_number}"


class FieldManager(models.Model):
    """
    A field/zone manager responsible for supervising a group of contract farmers
    in the seed multiplication program.
    """
    name = models.CharField(max_length=150)
    employee_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    region = models.CharField(
        max_length=255, blank=True,
        help_text="Territory or zone managed by this field manager (e.g. Telangana Zone)."
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Field Manager'
        verbose_name_plural = 'Field Managers'

    def __str__(self):
        return f"{self.name} ({self.employee_code or 'N/A'})"


class Farmer(models.Model):
    """A contract farmer who participates in the seed multiplication program."""
    name = models.CharField(max_length=150)
    grower_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    village = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    aadhar_number = models.CharField(max_length=20, blank=True)
    primary_location = models.ForeignKey(
        FieldLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='farmers'
    )
    field_manager = models.ForeignKey(
        FieldManager, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='farmers',
        help_text="The field manager responsible for supervising this farmer."
    )
    quality_score = models.DecimalField(
        max_digits=4, decimal_places=1, default=0.0,
        help_text="Score 0–10 based on seed purity and germination quality."
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.village})"


class SeedLot(models.Model):
    """
    A discrete batch of seeds at a specific stage of multiplication.
    Parent-child links form the traceable genealogy tree.
    """
    STAGE_CHOICES = [
        ('breeder', 'Breeder Seed'),
        ('foundation', 'Foundation Seed'),
        ('certified', 'Certified Seed'),
        ('commercial', 'Commercial Seed'),
    ]
    STATUS_CHOICES = [
        ('in_field', 'In Field'),
        ('harvested', 'Harvested'),
        ('dispatched', 'Dispatched'),
        ('sold', 'Sold'),
        ('rejected', 'Rejected'),
    ]

    lot_id = models.CharField(max_length=50, unique=True, help_text="e.g. BR-2026-001")
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    parent_lot = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_lots'
    )
    # Lab origin (optional — links to the tissue culture batch)
    lab_batch_reference = models.CharField(
        max_length=100, blank=True,
        help_text="Reference to the LabNest TC batch (e.g. TC-2026-045)"
    )
    variety = models.ForeignKey(Variety, on_delete=models.PROTECT, related_name='seed_lots')
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=3)
    season_year = models.IntegerField(help_text="The crop year this lot belongs to.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_field')

    # Location / Custody
    location = models.ForeignKey(
        FieldLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='seed_lots'
    )
    plot = models.ForeignKey(
        Plot, on_delete=models.SET_NULL, null=True, blank=True, related_name='seed_lots'
    )
    custom_plot_id = models.CharField(max_length=50, blank=True, null=True)
    custom_coordinates = models.CharField(max_length=100, blank=True, null=True)
    farmer = models.ForeignKey(
        Farmer, on_delete=models.SET_NULL, null=True, blank=True, related_name='seed_lots'
    )

    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'User', on_delete=models.PROTECT, related_name='created_seed_lots'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-season_year', 'stage', 'lot_id']
        verbose_name = 'Seed Lot'

    def __str__(self):
        return f"{self.lot_id} [{self.get_stage_display()}] — {self.quantity_kg}kg ({self.season_year})"

    @property
    def holder_name(self):
        if self.farmer:
            return self.farmer.name
        if self.location:
            return self.location.name
        return "Unassigned"


class SeedLotTransaction(models.Model):
    """
    Immutable ledger of events affecting a seed lot.
    Every dispatch, harvest return, or status change is recorded here.
    """
    TXN_TYPE_CHOICES = [
        ('dispatch', 'Dispatched to Farmer'),
        ('harvest', 'Harvest Received from Farmer'),
        ('status_change', 'Status Changed'),
        ('transfer', 'Lot Transferred'),
    ]
    seed_lot = models.ForeignKey(SeedLot, on_delete=models.CASCADE, related_name='transactions')
    txn_type = models.CharField(max_length=20, choices=TXN_TYPE_CHOICES)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    farmer = models.ForeignKey(Farmer, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey(FieldLocation, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='field_transactions')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        verbose_name = 'Seed Lot Transaction'

    def __str__(self):
        return f"{self.get_txn_type_display()} — {self.seed_lot.lot_id} on {self.recorded_at.date()}"

