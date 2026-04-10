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
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    mobile_number = models.CharField(max_length=15, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


# ============================================
# MASTER DATA / REFERENCE TABLES
# ============================================
class Area(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']


class Variety(models.Model):
    code = models.CharField(max_length=20, unique=True)  # e.g., SC-001
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    class Meta:
        verbose_name_plural = "Varieties"
        ordering = ['code']


class MediaType(models.Model):
    name = models.CharField(max_length=100, unique=True)  # MS Medium, B5 Medium, etc.
    description = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']


class FindingType(models.Model):
    name = models.CharField(max_length=100, unique=True)  # Healthy, Wilting, etc.
    
    def __str__(self):
        return self.name
    
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


class MediaPreparation(models.Model):
    batch_number = models.CharField(max_length=50, unique=True)
    media_type = models.ForeignKey(MediaType, on_delete=models.PROTECT)
    prep_date = models.DateField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    bottles_prepared = models.IntegerField()
    prepared_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='media_preparations')
    contamination_notes = models.TextField(blank=True)
    bottles_issued = models.IntegerField(default=0)
    issued_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Batch {self.batch_number} - {self.media_type.name}"
    
    class Meta:
        ordering = ['-prep_date']


class ContaminationMonitoring(models.Model):
    COLONY_TYPE_CHOICES = [
        ('Fungal', 'Fungal'),
        ('Bacterial', 'Bacterial'),
        ('Yeast', 'Yeast'),
        ('None', 'None'),
    ]
    
    date_time = models.DateTimeField()
    area = models.ForeignKey(Area, on_delete=models.PROTECT)
    plates_exposed = models.IntegerField(null=True, blank=True)
    observation_datetime = models.DateTimeField(null=True, blank=True)
    colony_count = models.IntegerField(default=0)
    colony_type = models.CharField(max_length=20, choices=COLONY_TYPE_CHOICES, default='None')
    action_taken = models.TextField(blank=True)
    recorded_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='contamination_monitorings')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.area.name} - {self.date_time.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        ordering = ['-date_time']


class ContaminationReport(models.Model):
    variety = models.ForeignKey(Variety, on_delete=models.PROTECT)
    source = models.CharField(max_length=50)  # Fungus, Bacteria
    type_desc = models.CharField(max_length=200, blank=True)
    bottles_affected = models.IntegerField(null=True, blank=True)
    operator = models.ForeignKey('User', on_delete=models.PROTECT, related_name='contamination_reports')
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.variety.code} - {self.source} ({self.date})"
    
    class Meta:
        ordering = ['-date']


class InoculationRoom(models.Model):
    variety = models.ForeignKey(Variety, on_delete=models.PROTECT)
    date = models.DateField()
    operator = models.ForeignKey('User', on_delete=models.PROTECT, related_name='inoculations')
    cultures = models.IntegerField()
    bottles = models.IntegerField()
    total_produced = models.IntegerField()
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.variety.code} - {self.date}"
    
    class Meta:
        ordering = ['-date']


class GrowthRoom(models.Model):
    variety = models.ForeignKey(Variety, on_delete=models.PROTECT)
    ltd_date = models.DateField()  # logged transaction date
    planning = models.CharField(max_length=100, blank=True)
    opening_bottles = models.IntegerField(default=0)
    opening_cultures = models.IntegerField(default=0)
    issued_bottles = models.IntegerField(default=0)
    issued_cultures = models.IntegerField(default=0)
    received_bottles = models.IntegerField(default=0)
    received_cultures = models.IntegerField(default=0)
    contaminated_bottles = models.IntegerField(default=0)
    contaminated_cultures = models.IntegerField(default=0)
    closing_bottles = models.IntegerField(default=0)
    closing_cultures = models.IntegerField(default=0)
    recorded_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='growth_room_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.variety.code} - {self.ltd_date}"
    
    class Meta:
        ordering = ['-ltd_date']


class Greenhouse(models.Model):
    variety = models.ForeignKey(Variety, on_delete=models.PROTECT)
    batch_number = models.CharField(max_length=50, blank=True)
    transplant_date = models.DateField(null=True, blank=True)
    operation_date = models.DateField(null=True, blank=True)
    operation_desc = models.CharField(max_length=200, blank=True)
    observation_date = models.DateField(null=True, blank=True)
    findings = models.ManyToManyField(FindingType, blank=True)
    plantlets_died = models.IntegerField(default=0)
    recorded_by = models.ForeignKey('User', on_delete=models.PROTECT, related_name='greenhouse_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.variety.code} - Batch {self.batch_number}"
    
class UserOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.email} - {self.otp} ({'Used' if self.is_used else 'Active'})"
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    class Meta:
        ordering = ['-created_at']

class RecentActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recent_activities')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"
