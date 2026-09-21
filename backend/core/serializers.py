from rest_framework import serializers
from django.db.models import Sum
from .models import (
    User, Variety, Chemical,
    InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog,
    RecentActivity, StockSolution, StockSolutionPreparation, StockSolutionChemicalUsage,
    StockSolutionRecipeItem, ExpenseCategory, Expense, ManpowerExpense,
    FieldLocation, Plot, FieldManager, Farmer, SeedLot, SeedLotTransaction
)


# ============================================
# USER SERIALIZERS
# ============================================
class UserSerializer(serializers.ModelSerializer):
    last_login = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M')
    date_joined = serializers.DateTimeField(read_only=True, format='%Y-%m-%d')

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'status', 'profile_picture', 'last_login', 'date_joined'
        ]
        read_only_fields = ['id', 'last_login', 'date_joined']


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    """Admin-only serializer: only allows updating role and status."""
    class Meta:
        model = User
        fields = ['role', 'status']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email', 'role', 'status', 'profile_picture']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ============================================
# MASTER DATA SERIALIZERS
# ============================================
class VarietySerializer(serializers.ModelSerializer):
    class Meta:
        model = Variety
        fields = '__all__'


class VarietyFieldCodeSerializer(serializers.ModelSerializer):
    """Admin-only serializer for updating the field_code mapping."""
    class Meta:
        model = Variety
        fields = ['id', 'code', 'name', 'field_code']
class VarietyFieldCodeSerializer(serializers.ModelSerializer):
    """Admin-only serializer for updating the field_code mapping."""
    class Meta:
        model = Variety
        fields = ['id', 'code', 'name', 'field_code']



# ============================================
# OPERATIONAL SERIALIZERS
# ============================================
class ChemicalSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Chemical
        fields = '__all__'



class InitiationLogSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    class Meta:
        model = InitiationLog
        fields = '__all__'

class MultiplicationLogSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    class Meta:
        model = MultiplicationLog
        fields = '__all__'

class RootingLogSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    class Meta:
        model = RootingLog
        fields = '__all__'

class HardeningLogSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    class Meta:
        model = HardeningLog
        fields = '__all__'

class TransplantationLogSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    variety_field_code = serializers.CharField(source='variety.field_code', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    class Meta:
        model = TransplantationLog
        fields = '__all__'


# ============================================
# AUTH SERIALIZERS
# ============================================
class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for current user self-profile edit.
    Users can edit: username, first_name, last_name, profile_picture.
    Locked fields: email, role, status (only admin can change these).
    """
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'role', 'status', 'profile_picture']
        read_only_fields = ['id', 'email', 'role', 'status']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate_username(self, value):
        """Ensure username is unique (excluding the current user)."""
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value


class RecentActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = RecentActivity
        fields = ['id', 'user', 'user_name', 'content', 'timestamp']
        read_only_fields = ['user', 'timestamp']


# ============================================
# STOCK SOLUTION RECIPE SERIALIZERS
# ============================================
class StockSolutionRecipeItemSerializer(serializers.ModelSerializer):
    stock_solution_name = serializers.CharField(source='stock_solution.name', read_only=True)
    chemical_name = serializers.CharField(source='chemical.name', read_only=True)
    chemical_unit = serializers.CharField(source='chemical.unit', read_only=True)

    class Meta:
        model = StockSolutionRecipeItem
        fields = ['id', 'stock_solution', 'stock_solution_name', 'chemical', 'chemical_name', 'chemical_unit', 'quantity_per_unit']
        read_only_fields = ['id']

# ============================================
# STOCK SOLUTION SERIALIZERS
# ============================================
class StockSolutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockSolution
        fields = '__all__'

class StockSolutionChemicalUsageSerializer(serializers.ModelSerializer):
    chemical_name = serializers.CharField(source='chemical.name', read_only=True)
    chemical_unit = serializers.CharField(source='chemical.unit', read_only=True)

    class Meta:
        model = StockSolutionChemicalUsage
        fields = ['id', 'chemical', 'chemical_name', 'chemical_unit', 'quantity_consumed']
        read_only_fields = ['id']

class StockSolutionPreparationSerializer(serializers.ModelSerializer):
    stock_solution_name = serializers.CharField(source='stock_solution.name', read_only=True)
    prepared_by_name = serializers.CharField(source='prepared_by.get_full_name', read_only=True)
    chemical_usages = StockSolutionChemicalUsageSerializer(many=True, read_only=True)

    class Meta:
        model = StockSolutionPreparation
        fields = '__all__'
        read_only_fields = ['prepared_by', 'created_at']

# ============================================
# EXPENSE TRACKING SERIALIZERS
# ============================================
class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['recorded_by', 'created_at']


# ============================================
# MANPOWER EXPENSE SERIALIZERS
# ============================================
class ManpowerExpenseSerializer(serializers.ModelSerializer):
    technician_name = serializers.SerializerMethodField()
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    daily_rate = serializers.SerializerMethodField()

    class Meta:
        model = ManpowerExpense
        fields = [
            'id', 'technician', 'technician_name',
            'monthly_salary', 'daily_rate',
            'notes', 'recorded_by', 'recorded_by_name', 'updated_at', 'created_at'
        ]
        read_only_fields = ['recorded_by', 'created_at', 'updated_at']

    def get_technician_name(self, obj):
        return obj.technician.get_full_name() or obj.technician.username

    def get_daily_rate(self, obj):
        return obj.daily_rate

    def validate_technician(self, value):
        """Ensure only technicians can have a salary record."""
        if value.role != 'technician':
            raise serializers.ValidationError(
                f"'{value.username}' is not a technician. Only technician role users can have salary records."
            )
        # On create (no instance), check if record already exists
        if not self.instance and ManpowerExpense.objects.filter(technician=value).exists():
            raise serializers.ValidationError(
                f"A salary record for {value.get_full_name() or value.username} already exists. "
                f"Edit the existing record instead."
            )
        return value


# ============================================
# FIELDLINK SERIALIZERS
# ============================================

class FieldLocationSerializer(serializers.ModelSerializer):
    plot_count = serializers.SerializerMethodField()

    class Meta:
        model = FieldLocation
        fields = ['id', 'name', 'location_type', 'district', 'state', 'notes', 'plot_count', 'created_at']
        read_only_fields = ['created_at']

    def get_plot_count(self, obj):
        return obj.plots.count()


class PlotSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = Plot
        fields = ['id', 'location', 'location_name', 'plot_number', 'area_acres', 'notes',
                  'boundaries', 'centroid_lat', 'centroid_lng']


class FieldManagerSerializer(serializers.ModelSerializer):
    farmer_count = serializers.SerializerMethodField()

    class Meta:
        model = FieldManager
        fields = [
            'id', 'name', 'employee_code', 'phone', 'email',
            'region', 'is_active', 'notes', 'created_at', 'farmer_count',
        ]
        read_only_fields = ['created_at']

    def get_farmer_count(self, obj):
        return obj.farmers.count()


class FarmerSerializer(serializers.ModelSerializer):
    primary_location_name = serializers.CharField(source='primary_location.name', read_only=True, default=None)
    field_manager_name = serializers.CharField(source='field_manager.name', read_only=True, default=None)
    total_seeds_taken_kg = serializers.SerializerMethodField()
    total_harvest_returned_kg = serializers.SerializerMethodField()
    yield_ratio = serializers.SerializerMethodField()

    class Meta:
        model = Farmer
        fields = [
            'id', 'name', 'grower_code', 'village', 'phone', 'aadhar_number',
            'primary_location', 'primary_location_name',
            'field_manager', 'field_manager_name',
            'quality_score', 'is_active', 'notes', 'created_at',
            'total_seeds_taken_kg', 'total_harvest_returned_kg', 'yield_ratio',
        ]
        read_only_fields = ['created_at']

    def get_total_seeds_taken_kg(self, obj):
        dispatches = [t for t in obj.seedlottransaction_set.all() if t.txn_type == 'dispatch']
        return float(sum(t.quantity_kg or 0 for t in dispatches))

    def get_total_harvest_returned_kg(self, obj):
        harvests = [t for t in obj.seedlottransaction_set.all() if t.txn_type == 'harvest']
        return float(sum(t.quantity_kg or 0 for t in harvests))

    def get_yield_ratio(self, obj):
        taken = self.get_total_seeds_taken_kg(obj)
        returned = self.get_total_harvest_returned_kg(obj)
        if taken > 0:
            return round(returned / taken, 2)
        return None


class SeedLotSerializer(serializers.ModelSerializer):
    parent_lot_id = serializers.CharField(source='parent_lot.lot_id', read_only=True)
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    variety_name = serializers.CharField(source='variety.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    farmer_grower_code = serializers.CharField(source='farmer.grower_code', read_only=True)
    plot_number = serializers.CharField(source='plot.plot_number', read_only=True)
    holder_name = serializers.ReadOnlyField()
    child_count = serializers.SerializerMethodField()

    class Meta:
        model = SeedLot
        fields = [
            'id', 'lot_id', 'stage', 'parent_lot', 'parent_lot_id',
            'lab_batch_reference', 'variety', 'variety_code', 'variety_name',
            'quantity_kg', 'season_year', 'status',
            'location', 'location_name', 'plot', 'plot_number', 'custom_plot_id', 'custom_coordinates',
            'farmer', 'farmer_name', 'farmer_grower_code', 'holder_name',
            'notes', 'created_by', 'created_at', 'updated_at', 'child_count',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_child_count(self, obj):
        return obj.child_lots.count()

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class SeedLotTransactionSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    lot_id = serializers.CharField(source='seed_lot.lot_id', read_only=True)

    class Meta:
        model = SeedLotTransaction
        fields = [
            'id', 'seed_lot', 'lot_id', 'txn_type',
            'quantity_kg', 'farmer', 'farmer_name',
            'location', 'location_name',
            'notes', 'recorded_by', 'recorded_by_name', 'recorded_at',
        ]
        read_only_fields = ['recorded_at', 'recorded_by']

    def create(self, validated_data):
        validated_data['recorded_by'] = self.context['request'].user
        return super().create(validated_data)
