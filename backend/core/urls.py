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

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    
    # Auth endpoints
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/signup/', views.SignupView.as_view(), name='signup'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
]
