from rest_framework import serializers
from .models import (
    User, Variety, Chemical,
    InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog,
    RecentActivity, StockSolution, StockSolutionPreparation, StockSolutionChemicalUsage,
    StockSolutionRecipeItem, ExpenseCategory, Expense
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
