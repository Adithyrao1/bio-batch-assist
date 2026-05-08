from rest_framework import serializers
from .models import (
    User, Area, Variety, MediaType, FindingType,
    Chemical, MediaPreparation, ContaminationMonitoring,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse,
    RecentActivity, MediaChemicalRequirement, ChemicalUsageLog,
    StockSolution, StockSolutionPreparation, StockSolutionChemicalUsage, MediaStockUsage
)


# ============================================
# USER SERIALIZERS
# ============================================
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'status', 'profile_picture']
        read_only_fields = ['id']


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
class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = '__all__'


class VarietySerializer(serializers.ModelSerializer):
    class Meta:
        model = Variety
        fields = '__all__'


class MediaTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaType
        fields = '__all__'


class FindingTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FindingType
        fields = '__all__'


# ============================================
# OPERATIONAL SERIALIZERS
# ============================================
class ChemicalSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Chemical
        fields = '__all__'


class MediaStockUsageSerializer(serializers.ModelSerializer):
    stock_solution_name = serializers.CharField(source='stock_solution.name', read_only=True)

    class Meta:
        model = MediaStockUsage
        fields = ['id', 'stock_solution', 'stock_solution_name', 'volume_consumed']
        read_only_fields = ['id']

class MediaPreparationSerializer(serializers.ModelSerializer):
    media_type_name = serializers.CharField(source='media_type.name', read_only=True)
    prepared_by_name = serializers.CharField(source='prepared_by.get_full_name', read_only=True)
    stock_usages = MediaStockUsageSerializer(many=True, read_only=True)
    
    class Meta:
        model = MediaPreparation
        fields = '__all__'
        read_only_fields = ['prepared_by', 'created_at']


class ContaminationMonitoringSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = ContaminationMonitoring
        fields = '__all__'
        read_only_fields = ['recorded_by', 'created_at']


class ContaminationReportSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)
    
    class Meta:
        model = ContaminationReport
        fields = '__all__'


class InoculationRoomSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)
    
    class Meta:
        model = InoculationRoom
        fields = '__all__'


class GrowthRoomSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = GrowthRoom
        fields = '__all__'


class GreenhouseSerializer(serializers.ModelSerializer):
    variety_code = serializers.CharField(source='variety.code', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    finding_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Greenhouse
        fields = '__all__'
    
    def get_finding_names(self, obj):
        return [f.name for f in obj.findings.all()]


# ============================================
# AUTH SERIALIZERS
# ============================================
class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for current user profile"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'role', 'status', 'profile_picture']
        read_only_fields = ['id', 'username', 'role', 'status']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RecentActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = RecentActivity
        fields = ['id', 'user', 'user_name', 'content', 'timestamp']
        read_only_fields = ['user', 'timestamp']


# ============================================
# CHEMICAL ↔ MEDIA PREPARATION SERIALIZERS
# ============================================
class MediaChemicalRequirementSerializer(serializers.ModelSerializer):
    media_type_name = serializers.CharField(source='media_type.name', read_only=True)
    chemical_name = serializers.CharField(source='chemical.name', read_only=True)
    chemical_unit = serializers.CharField(source='chemical.unit', read_only=True)

    class Meta:
        model = MediaChemicalRequirement
        fields = ['id', 'media_type', 'media_type_name', 'chemical', 'chemical_name', 'chemical_unit', 'quantity_required']
        read_only_fields = ['id']


class ChemicalUsageLogSerializer(serializers.ModelSerializer):
    chemical_name = serializers.CharField(source='chemical.name', read_only=True)
    chemical_unit = serializers.CharField(source='chemical.unit', read_only=True)
    batch_number = serializers.CharField(source='media_preparation.batch_number', read_only=True)

    class Meta:
        model = ChemicalUsageLog
        fields = ['id', 'chemical', 'chemical_name', 'chemical_unit', 'media_preparation', 'batch_number', 'quantity_consumed', 'timestamp']
        read_only_fields = ['id', 'timestamp']

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
