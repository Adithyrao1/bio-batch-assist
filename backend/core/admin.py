from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Variety,
    Chemical, StockSolution, StockSolutionRecipeItem, StockSolutionPreparation, StockSolutionChemicalUsage,
    InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog,
    FieldManager, Farmer
)


class StockSolutionRecipeItemInline(admin.TabularInline):
    model = StockSolutionRecipeItem
    extra = 1
    autocomplete_fields = ['chemical']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'first_name', 'last_name', 'role', 'status']
    list_filter = ['role', 'status']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'status')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'status')}),
    )


@admin.register(Variety)
class VarietyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'description']
    search_fields = ['code', 'name']


@admin.register(StockSolution)
class StockSolutionAdmin(admin.ModelAdmin):
    list_display = ['name', 'remaining_volume', 'unit']
    inlines = [StockSolutionRecipeItemInline]
    search_fields = ['name']

@admin.register(Chemical)
class ChemicalAdmin(admin.ModelAdmin):
    list_display = ['name', 'quantity', 'unit', 'remaining_stock', 'expiry_date']
    list_filter = ['unit']
    search_fields = ['name']

@admin.register(StockSolutionPreparation)
class StockSolutionPreparationAdmin(admin.ModelAdmin):
    list_display = ['stock_solution', 'volume_prepared', 'date', 'prepared_by']
    list_filter = ['stock_solution', 'date']
    search_fields = ['stock_solution__name']

@admin.register(StockSolutionChemicalUsage)
class StockSolutionChemicalUsageAdmin(admin.ModelAdmin):
    list_display = ['chemical', 'preparation', 'quantity_consumed']
    list_filter = ['chemical']
    readonly_fields = ['chemical', 'preparation', 'quantity_consumed']

    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(InitiationLog)
class InitiationLogAdmin(admin.ModelAdmin):
    list_display = ['variety', 'date', 'technician', 'bottles_inoculated']
    list_filter = ['variety', 'date']

@admin.register(MultiplicationLog)
class MultiplicationLogAdmin(admin.ModelAdmin):
    list_display = ['variety', 'date', 'technician', 'cycle_number', 'bottles_produced']
    list_filter = ['variety', 'date', 'cycle_number']

@admin.register(RootingLog)
class RootingLogAdmin(admin.ModelAdmin):
    list_display = ['variety', 'date', 'technician', 'rooting_bottles']
    list_filter = ['variety', 'date']

@admin.register(HardeningLog)
class HardeningLogAdmin(admin.ModelAdmin):
    list_display = ['variety', 'date', 'technician', 'seedlings_transplanted']
    list_filter = ['variety', 'date']

@admin.register(TransplantationLog)
class TransplantationLogAdmin(admin.ModelAdmin):
    list_display = ['variety', 'date', 'technician', 'seedlings_transplanted']
    list_filter = ['variety', 'date']


@admin.register(FieldManager)
class FieldManagerAdmin(admin.ModelAdmin):
    list_display = ['name', 'employee_code', 'region', 'phone', 'email', 'farmer_count', 'is_active']
    list_filter = ['is_active', 'region']
    search_fields = ['name', 'employee_code', 'region']

    def farmer_count(self, obj):
        return obj.farmers.count()
    farmer_count.short_description = 'Farmers'


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ['name', 'grower_code', 'village', 'field_manager', 'is_active', 'quality_score']
    list_filter = ['is_active', 'field_manager']
    search_fields = ['name', 'grower_code', 'village']
    autocomplete_fields = ['field_manager']
