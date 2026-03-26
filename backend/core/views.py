from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta

from .models import (
    User, Area, Variety, MediaType, FindingType,
    Chemical, MediaPreparation, ContaminationMonitoring,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse
)
from .serializers import (
    UserSerializer, UserCreateSerializer, AreaSerializer, VarietySerializer,
    MediaTypeSerializer, FindingTypeSerializer, ChemicalSerializer,
    MediaPreparationSerializer, ContaminationMonitoringSerializer,
    ContaminationReportSerializer, InoculationRoomSerializer,
    GrowthRoomSerializer, GreenhouseSerializer,
    LoginSerializer, SignupSerializer, UserProfileSerializer
)


# ============================================
# AUTH VIEWS
# ============================================
class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: {"username": "admin", "password": "admin123"}
    Returns: access token, refresh token, and user info
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if user.status != 'active':
            return Response(
                {'error': 'Account is inactive. Contact administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'role': user.role,
            }
        })


class SignupView(APIView):
    """
    POST /api/auth/signup/
    Body: {"username": "newuser", "password": "pass123", "password_confirm": "pass123", 
           "first_name": "John", "last_name": "Doe", "email": "john@example.com"}
    Returns: access token, refresh token, and user info
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'role': user.role,
            }
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: {"refresh": "refresh_token_here"}
    Blacklists the refresh token
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'message': 'Logged out'})


class ProfileView(APIView):
    """
    GET /api/auth/profile/ - Get current user profile
    PUT /api/auth/profile/ - Update current user profile
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Body: {"old_password": "current", "new_password": "newpass123"}
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response(
                {'error': 'Both old_password and new_password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 6:
            return Response(
                {'error': 'New password must be at least 6 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not request.user.check_password(old_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request.user.set_password(new_password)
        request.user.save()
        
        return Response({'message': 'Password changed successfully'})


# ============================================
# PERMISSION CLASSES
# ============================================
class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ['admin', 'technician']


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'admin'


# ============================================
# USER VIEWSET
# ============================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


# ============================================
# MASTER DATA VIEWSETS
# ============================================
class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAdminOrReadOnly]


class VarietyViewSet(viewsets.ModelViewSet):
    queryset = Variety.objects.all()
    serializer_class = VarietySerializer
    permission_classes = [IsAdminOrReadOnly]


class MediaTypeViewSet(viewsets.ModelViewSet):
    queryset = MediaType.objects.all()
    serializer_class = MediaTypeSerializer
    permission_classes = [IsAdminOrReadOnly]


class FindingTypeViewSet(viewsets.ModelViewSet):
    queryset = FindingType.objects.all()
    serializer_class = FindingTypeSerializer
    permission_classes = [IsAdminOrReadOnly]


# ============================================
# OPERATIONAL VIEWSETS
# ============================================
class ChemicalViewSet(viewsets.ModelViewSet):
    queryset = Chemical.objects.all()
    serializer_class = ChemicalSerializer
    permission_classes = [IsAdminOrTechnician]
    
    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """
        Adjust remaining stock by a given amount.
        POST /api/chemicals/{id}/adjust_stock/
        Body: {"amount": -1} or {"amount": 5}
        """
        chemical = self.get_object()
        amount = request.data.get('amount', 0)
        
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        new_stock = float(chemical.remaining_stock) + amount
        
        if new_stock < 0:
            return Response({'error': 'Stock cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)
        
        chemical.remaining_stock = new_stock
        chemical.save()
        
        return Response({
            'id': chemical.id,
            'name': chemical.name,
            'remaining_stock': chemical.remaining_stock,
            'message': f'Stock adjusted by {amount}'
        })


class MediaPreparationViewSet(viewsets.ModelViewSet):
    queryset = MediaPreparation.objects.select_related('media_type', 'prepared_by').all()
    serializer_class = MediaPreparationSerializer
    permission_classes = [IsAdminOrTechnician]


class ContaminationMonitoringViewSet(viewsets.ModelViewSet):
    queryset = ContaminationMonitoring.objects.select_related('area', 'recorded_by').all()
    serializer_class = ContaminationMonitoringSerializer
    permission_classes = [IsAdminOrTechnician]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class ContaminationReportViewSet(viewsets.ModelViewSet):
    queryset = ContaminationReport.objects.select_related('variety', 'operator').all()
    serializer_class = ContaminationReportSerializer
    permission_classes = [IsAdminOrTechnician]


class InoculationRoomViewSet(viewsets.ModelViewSet):
    queryset = InoculationRoom.objects.select_related('variety', 'operator').all()
    serializer_class = InoculationRoomSerializer
    permission_classes = [IsAdminOrTechnician]


class GrowthRoomViewSet(viewsets.ModelViewSet):
    queryset = GrowthRoom.objects.select_related('variety', 'recorded_by').all()
    serializer_class = GrowthRoomSerializer
    permission_classes = [IsAdminOrTechnician]


class GreenhouseViewSet(viewsets.ModelViewSet):
    queryset = Greenhouse.objects.select_related('variety', 'recorded_by').prefetch_related('findings').all()
    serializer_class = GreenhouseSerializer
    permission_classes = [IsAdminOrTechnician]


# ============================================
# DASHBOARD API
# ============================================
class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Get date range from query params (default: last 30 days)
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        # Stats
        total_chemicals = Chemical.objects.count()
        expired_chemicals = Chemical.objects.filter(expiry_date__lt=timezone.now().date()).count()
        total_contamination = ContaminationMonitoring.objects.filter(date_time__date__gte=start_date).count()
        total_production = InoculationRoom.objects.filter(date__gte=start_date).aggregate(
            total=Sum('total_produced')
        )['total'] or 0
        
        # Contamination by area (heatmap data)
        contamination_by_area = ContaminationMonitoring.objects.filter(
            date_time__date__gte=start_date
        ).values('area__name').annotate(count=Count('id')).order_by('-count')
        
        # Production trend by month
        production_trend = InoculationRoom.objects.filter(
            date__gte=start_date
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('total_produced')
        ).order_by('month')
        
        # Variety distribution
        variety_distribution = InoculationRoom.objects.filter(
            date__gte=start_date
        ).values('variety__code').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'stats': {
                'total_chemicals': total_chemicals,
                'expired_chemicals': expired_chemicals,
                'total_contamination': total_contamination,
                'total_production': total_production,
            },
            'contamination_by_area': list(contamination_by_area),
            'production_trend': list(production_trend),
            'variety_distribution': list(variety_distribution),
        })

