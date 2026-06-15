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

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


# ============================================
# MASTER DATA / REFERENCE TABLES
# ============================================



class Variety(models.Model):
    code = models.CharField(max_length=20, unique=True)  # e.g., SC-001
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    
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
