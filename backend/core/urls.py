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

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('tasks/trigger-weekly-digest/', views.TriggerWeeklyDigestView.as_view(), name='trigger_weekly_digest'),
    path('tasks/trigger-chemical-expiry-digest/', views.TriggerChemicalExpiryDigestView.as_view(), name='trigger_chemical_expiry_digest'),
    
    # Auth endpoints
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/entra-login/', views.EntraLoginView.as_view(), name='entra_login'),
    path('auth/signup/', views.SignupView.as_view(), name='signup'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('auth/request-otp/', views.RequestOTPView.as_view(), name='request_otp'),
    path('auth/verify-otp/', views.VerifyOTPView.as_view(), name='verify_otp'),
    path('auth/settings/request-otp/', views.AuthSettingsOTPRequestView.as_view(), name='settings_request_otp'),
    path('auth/settings/verify-otp/', views.AuthSettingsOTPVerifyView.as_view(), name='settings_verify_otp'),
    path('auth/complete-signup/', views.CompleteSignupView.as_view(), name='complete_signup'),
    path('auth/forgot-password/request-otp/', views.ForgotPasswordRequestView.as_view(), name='forgot_password_request'),
    path('auth/forgot-password/reset/', views.ForgotPasswordResetView.as_view(), name='forgot_password_reset'),

    # AI Assistant (LangChain + DeepSeek + MySQL)
    path('ai-assistant/', views.AIAssistantView.as_view(), name='ai_assistant'),
]
