from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()

# User management
router.register(r'users', views.UserViewSet)

# Master data
router.register(r'areas', views.AreaViewSet)
router.register(r'varieties', views.VarietyViewSet)
router.register(r'media-types', views.MediaTypeViewSet)
router.register(r'finding-types', views.FindingTypeViewSet)

# Operational modules
router.register(r'chemicals', views.ChemicalViewSet)
router.register(r'media-preparation', views.MediaPreparationViewSet)
router.register(r'contamination-monitoring', views.ContaminationMonitoringViewSet)
router.register(r'contamination-reports', views.ContaminationReportViewSet)
router.register(r'inoculation-room', views.InoculationRoomViewSet)
router.register(r'growth-room', views.GrowthRoomViewSet)
router.register(r'greenhouse', views.GreenhouseViewSet)
router.register(r'recent-activity', views.RecentActivityViewSet)
router.register(r'media-chemical-requirements', views.MediaChemicalRequirementViewSet, basename='media-chemical-requirements')
router.register(r'chemical-usage-logs', views.ChemicalUsageLogViewSet, basename='chemical-usage-logs')
router.register(r'stock-solutions', views.StockSolutionViewSet, basename='stock-solutions')
router.register(r'stock-preparations', views.StockSolutionPreparationViewSet, basename='stock-preparations')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('tasks/trigger-weekly-digest/', views.TriggerWeeklyDigestView.as_view(), name='trigger_weekly_digest'),
    path('tasks/trigger-chemical-expiry-digest/', views.TriggerChemicalExpiryDigestView.as_view(), name='trigger_chemical_expiry_digest'),
    
    # Auth endpoints
    path('auth/entra-login/', views.EntraLoginView.as_view(), name='entra_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),

    # AI Assistant (LangChain + DeepSeek + MySQL)
    path('ai-assistant/', views.AIAssistantView.as_view(), name='ai_assistant'),
]
