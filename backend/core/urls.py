from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import reports_excel

router = DefaultRouter()

# User management
router.register(r'users', views.UserViewSet, basename='user')

# Master data
router.register(r'varieties', views.VarietyViewSet)


# Operational modules
router.register(r'chemicals', views.ChemicalViewSet)

router.register(r'initiation', views.InitiationLogViewSet)
router.register(r'multiplication', views.MultiplicationLogViewSet)
router.register(r'rooting', views.RootingLogViewSet)
router.register(r'hardening', views.HardeningLogViewSet)
router.register(r'transplantation', views.TransplantationLogViewSet)
router.register(r'recent-activity', views.RecentActivityViewSet)
router.register(r'stock-recipes', views.StockSolutionRecipeItemViewSet, basename='stock-recipes')
router.register(r'stock-solutions', views.StockSolutionViewSet, basename='stock-solutions')
router.register(r'stock-preparations', views.StockSolutionPreparationViewSet, basename='stock-preparations')
router.register(r'expense-categories', views.ExpenseCategoryViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'manpower', views.ManpowerExpenseViewSet, basename='manpower')

# FieldLink routes
router.register(r'field/locations', views.FieldLocationViewSet, basename='field-locations')
router.register(r'field/plots', views.PlotViewSet, basename='field-plots')
router.register(r'field/managers', views.FieldManagerViewSet, basename='field-managers')
router.register(r'field/farmers', views.FarmerViewSet, basename='field-farmers')
router.register(r'field/seed-lots', views.SeedLotViewSet, basename='field-seed-lots')
router.register(r'field/transactions', views.SeedLotTransactionViewSet, basename='field-transactions')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('field/dashboard/', views.FieldDashboardView.as_view(), name='field_dashboard'),
    path('tasks/trigger-weekly-digest/', views.TriggerWeeklyDigestView.as_view(), name='trigger_weekly_digest'),
    path('tasks/trigger-chemical-expiry-digest/', views.TriggerChemicalExpiryDigestView.as_view(), name='trigger_chemical_expiry_digest'),
    
    # Auth endpoints
    path('auth/entra-login/', views.EntraLoginView.as_view(), name='entra_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),
    path('auth/admin/pending-users/', views.PendingUsersView.as_view(), name='pending_users'),
    path('auth/admin/approve-user/', views.AdminApproveUserView.as_view(), name='approve_user'),
    
    # Reports
    path('reports/production-excel/', reports_excel.generate_production_excel_report, name='production_excel'),
    path('reports/expenses-excel/', reports_excel.generate_expenses_excel_report, name='expenses_excel'),
    path('reports/check-status/<str:task_id>/', reports_excel.check_report_status, name='check_report_status'),
    path('reports/download/<str:task_id>/', reports_excel.download_report_result, name='download_report_result'),

    # AI Assistant (LangChain + DeepSeek + MySQL)
    path('ai-assistant/', views.AIAssistantView.as_view(), name='ai_assistant'),
]
