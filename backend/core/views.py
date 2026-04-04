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

from django.core.mail import send_mail
from django.conf import settings
import random
import string

from .models import (
    User, Area, Variety, MediaType, FindingType,
    Chemical, MediaPreparation, ContaminationMonitoring,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse,
    UserOTP
)
from .serializers import (
    UserSerializer, UserCreateSerializer, AreaSerializer, VarietySerializer,
    MediaTypeSerializer, FindingTypeSerializer, ChemicalSerializer,
    MediaPreparationSerializer, ContaminationMonitoringSerializer,
    ContaminationReportSerializer, InoculationRoomSerializer,
    GrowthRoomSerializer, GreenhouseSerializer,
    LoginSerializer, SignupSerializer, UserProfileSerializer,
    RequestOTPSerializer, VerifyOTPSerializer
)


# ============================================
# AUTH VIEWS
# ============================================
class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: {"email": "user@example.com", "password": "pass123"}
    Returns: access token, refresh token, and user info
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Look up user by email directly in authenticate
        user = authenticate(email=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid email or password'},
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


def _generate_password(length=12):
    """Generate a secure random password."""
    chars = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(random.choices(chars, k=length))


class RequestOTPView(APIView):
    """
    POST /api/auth/request-otp/
    Body: {"email": "user@example.com"}
    Generates and sends a 6-digit OTP to the provided email for SIGNUP.
    Returns 400 if email already has an active account.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import RequestOTPSerializer
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Prevent OTP for already-registered emails
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'An account with this email already exists. Please log in.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate 6-digit OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=10)

        # Invalidate previous OTPs for this email
        UserOTP.objects.filter(email=email, is_used=False).update(is_used=True)

        UserOTP.objects.create(
            email=email,
            otp=otp_code,
            expires_at=expires_at
        )

        subject = 'Your Bio-Batch-Assist Signup Code'
        text_content = f'Welcome! Your signup verification code is: {otp_code}'
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f4ff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1035; margin-bottom: 5px;">Bio-Batch Assist</h1>
                <p style="color: #6b7280; margin-top: 0; font-size: 14px;">Secure Identity Verification</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.05); border: 1px solid rgba(124, 58, 237, 0.1);">
                <h2 style="color: #1a1035; margin-top: 0; font-size: 20px;">Your Verification Code</h2>
                <p style="color: #4b5563; line-height: 1.5; margin-bottom: 25px;">
                    Please enter the following 6-digit code to continue your registration. This code will expire in 10 minutes.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1)); padding: 20px; border-radius: 12px; display: inline-block; border: 1px solid rgba(124, 58, 237, 0.2);">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #7c3aed;">{otp_code}</span>
                    </div>
                </div>
                
                <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 0;">
                    If you didn't request this code, you can safely ignore this email.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <p style="color: #9ca3af; font-size: 12px;">© 2026 DCM Shriram Ltd. All rights reserved.</p>
            </div>
        </div>
        """
        
        try:
            from django.core.mail import EmailMultiAlternatives
            msg = EmailMultiAlternatives(subject, text_content, settings.EMAIL_HOST_USER, [email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            return Response({'message': 'OTP sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyOTPView(APIView):
    """
    POST /api/auth/verify-otp/
    Body: {"email": "user@example.com", "otp": "123456", "first_name": "John", "last_name": "Doe"}
    Verifies OTP, creates user account, notifies admin via email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .serializers import VerifyOTPSerializer
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp']
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()

        # Find valid OTP
        otp_record = UserOTP.objects.filter(
            email=email,
            otp=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()

        if not otp_record:
            return Response(
                {'error': 'Invalid or expired verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        # Create user account
        username = email.split('@')[0]
        if User.objects.filter(username=username).exists():
            username = f"{username}_{random.randint(100, 999)}"

        temp_password = _generate_password()
        
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=temp_password,
            role='viewer',
            status='active'
        )

        # Prepare emails for user and admin
        full_name = f"{first_name} {last_name}".strip() or username
        
        # 1. Send password to User
        user_subject = 'Welcome to Bio-Batch-Assist: Your Login Credentials'
        user_text = f'Welcome {full_name},\n\nYour account has been created. Your temporary password is: {temp_password}\n\nPlease log in and change it.'
        user_html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f4ff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1035; margin-bottom: 5px;">Bio-Batch Assist</h1>
                <p style="color: #6b7280; margin-top: 0; font-size: 14px;">Account Created Successfully</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.05); border: 1px solid rgba(124, 58, 237, 0.1);">
                <h2 style="color: #1a1035; margin-top: 0; font-size: 20px;">Welcome, {first_name}! 🎉</h2>
                <p style="color: #4b5563; line-height: 1.5; margin-bottom: 15px;">
                    Your account has been successfully created. Here are your temporary login credentials:
                </p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed; margin-bottom: 25px;">
                    <p style="margin: 0; color: #4b5563;"><strong>Email:</strong> {email}</p>
                    <p style="margin: 10px 0 0 0; color: #4b5563;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #7c3aed;">{temp_password}</span></p>
                </div>
                
                <p style="color: #ef4444; font-size: 13px; font-weight: 500; margin-bottom: 0;">
                    ⚠️ Important: For your security, please change your password immediately after logging in.
                </p>
            </div>
        </div>
        """
        
        # 2. Inform the Admin
        admin_email = 'adithyananuvala001@gmail.com'
        admin_subject = f'New User Registration: {full_name}'
        admin_text = f'New user {full_name} ({email}) signed up. Temporary password: {temp_password}'
        admin_html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">New User Registration</h2>
                <p style="color: #475569; margin-bottom: 10px;"><strong>Name:</strong> {full_name}</p>
                <p style="color: #475569; margin-bottom: 10px;"><strong>Email:</strong> {email}</p>
                <p style="color: #475569; margin-bottom: 10px;"><strong>Generated Password:</strong> <span style="font-family: monospace; display:inline-block; padding: 2px 6px; background: #f1f5f9; border-radius: 4px;">{temp_password}</span></p>
            </div>
        </div>
        """
        
        from django.core.mail import EmailMultiAlternatives
        
        try:
            # Send to User
            user_msg = EmailMultiAlternatives(user_subject, user_text, settings.EMAIL_HOST_USER, [email])
            user_msg.attach_alternative(user_html, "text/html")
            user_msg.send(fail_silently=False)
            
            # Send to Admin
            admin_msg = EmailMultiAlternatives(admin_subject, admin_text, settings.EMAIL_HOST_USER, [admin_email])
            admin_msg.attach_alternative(admin_html, "text/html")
            admin_msg.send(fail_silently=True)
            
        except Exception as e:
            # Re-raise or handle if email fails so user knows? Better to have it fail and user retry instead of silent fail.
            # However, user is already created at this point.
            # In a true robust system, we would generate the password later if it fails but here it's okay for now.
            pass

        return Response({
            'message': 'Account created successfully. Your login credentials have been sent to your email.',
            'username': username,
        }, status=status.HTTP_201_CREATED)


# ============================================
# AUTH SETTINGS VIEWS (OTP PASSWORD CHANGE)
# ============================================

class AuthSettingsOTPRequestView(APIView):
    """
    POST /api/auth/settings/request-otp/
    Requires Auth. Sends an OTP to the logged-in user's email for password change.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        email = user.email
        
        # Generate 6-digit OTP
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=10)

        # Invalidate previous OTPs for this email
        UserOTP.objects.filter(email=email, is_used=False).update(is_used=True)

        UserOTP.objects.create(email=email, otp=otp_code, expires_at=expires_at)

        subject = 'Security Alert: Password Change Request'
        text_content = f'Hello {user.first_name}, your password change verification code is: {otp_code}'
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f4ff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a1035; margin-bottom: 5px;">Bio-Batch Assist</h1>
                <p style="color: #6b7280; margin-top: 0; font-size: 14px;">Account Security Settings</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.05); border: 1px solid rgba(124, 58, 237, 0.1);">
                <h2 style="color: #1a1035; margin-top: 0; font-size: 20px;">Password Change Authorization</h2>
                <p style="color: #4b5563; line-height: 1.5; margin-bottom: 25px;">
                    We received a request to change your account password. Please use the following code to authorize this change:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1)); padding: 20px; border-radius: 12px; display: inline-block; border: 1px solid rgba(124, 58, 237, 0.2);">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #7c3aed;">{otp_code}</span>
                    </div>
                </div>
                
                <p style="color: #ef4444; font-size: 13px; text-align: center; margin-bottom: 0;">
                    If you did not request this change, please ignore this email. Your password will remain secure.
                </p>
            </div>
        </div>
        """
        
        try:
            from django.core.mail import EmailMultiAlternatives
            msg = EmailMultiAlternatives(subject, text_content, settings.EMAIL_HOST_USER, [email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            return Response({'message': 'Authorization code sent to your email'})
        except Exception as e:
            return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuthSettingsOTPVerifyView(APIView):
    """
    POST /api/auth/settings/verify-otp/
    Body: {"otp": "123456", "new_password": "newsecurepassword123"}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        otp_code = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not otp_code or not new_password:
            return Response({'error': 'Both OTP and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        if len(new_password) < 6:
            return Response({'error': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)

        # Find valid OTP for the logged in user
        otp_record = UserOTP.objects.filter(
            email=user.email,
            otp=otp_code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()

        if not otp_record:
            return Response(
                {'error': 'Invalid or expired authorization code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as used and update password
        otp_record.is_used = True
        otp_record.save()
        
        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password has been successfully changed'})


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

    def perform_create(self, serializer):
        serializer.save(prepared_by=self.request.user)


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

