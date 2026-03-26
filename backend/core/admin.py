from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Area, Variety, MediaType, FindingType,
    Chemical, MediaPreparation, ContaminationMonitoring,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse
)


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


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(Variety)
class VarietyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'description']
    search_fields = ['code', 'name']


@admin.register(MediaType)
class MediaTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']


@admin.register(FindingType)
class FindingTypeAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(Chemical)
class ChemicalAdmin(admin.ModelAdmin):
    list_display = ['name', 'quantity', 'unit', 'remaining_stock', 'expiry_date']
    list_filter = ['unit']
    search_fields = ['name']


@admin.register(MediaPreparation)
class MediaPreparationAdmin(admin.ModelAdmin):
    list_display = ['batch_number', 'media_type', 'prep_date', 'bottles_prepared', 'prepared_by']
    list_filter = ['media_type', 'prep_date']
    search_fields = ['batch_number']


@admin.register(ContaminationMonitoring)
class ContaminationMonitoringAdmin(admin.ModelAdmin):
    list_display = ['date_time', 'area', 'colony_count', 'colony_type', 'recorded_by']
    list_filter = ['area', 'colony_type']


@admin.register(ContaminationReport)
class ContaminationReportAdmin(admin.ModelAdmin):
    list_display = ['variety', 'source', 'bottles_affected', 'operator', 'date']
    list_filter = ['source', 'date']


@admin.register(InoculationRoom)
class InoculationRoomAdmin(admin.ModelAdmin):
    list_display = ['variety', 'date', 'operator', 'cultures', 'bottles', 'total_produced']
    list_filter = ['variety', 'date']


@admin.register(GrowthRoom)
class GrowthRoomAdmin(admin.ModelAdmin):
    list_display = ['variety', 'ltd_date', 'opening_bottles', 'closing_bottles', 'recorded_by']
    list_filter = ['variety', 'ltd_date']


@admin.register(Greenhouse)
class GreenhouseAdmin(admin.ModelAdmin):
    list_display = ['variety', 'batch_number', 'operation_date', 'plantlets_died', 'recorded_by']
    list_filter = ['variety', 'operation_date']
