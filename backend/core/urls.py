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

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('tasks/trigger-weekly-digest/', views.TriggerWeeklyDigestView.as_view(), name='trigger_weekly_digest'),
    path('tasks/trigger-chemical-expiry-digest/', views.TriggerChemicalExpiryDigestView.as_view(), name='trigger_chemical_expiry_digest'),
    
    # Auth endpoints
    path('auth/entra-login/', views.EntraLoginView.as_view(), name='entra_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),
    
    # Reports
    path('reports/production-excel/', reports_excel.generate_production_excel_report, name='production_excel'),
    path('reports/expenses-excel/', reports_excel.generate_expenses_excel_report, name='expenses_excel'),
    path('reports/check-status/<str:task_id>/', reports_excel.check_report_status, name='check_report_status'),
    path('reports/download/<str:task_id>/', reports_excel.download_report_result, name='download_report_result'),

    # AI Assistant (LangChain + DeepSeek + MySQL)
    path('ai-assistant/', views.AIAssistantView.as_view(), name='ai_assistant'),
]
