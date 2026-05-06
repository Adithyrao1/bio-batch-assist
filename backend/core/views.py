from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.core import signing
from datetime import timedelta

from django.core.mail import send_mail
from django.conf import settings
import random
import string

from .models import (
    User, Area, Variety, MediaType, FindingType,
    Chemical, MediaPreparation, ContaminationMonitoring,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse,
    ContaminationReport, InoculationRoom, GrowthRoom, Greenhouse,
    RecentActivity, MediaChemicalRequirement, ChemicalUsageLog,
    StockSolution, StockSolutionPreparation, StockSolutionChemicalUsage, MediaStockUsage
)
from .serializers import (
    UserSerializer, UserCreateSerializer, AreaSerializer, VarietySerializer,
    MediaTypeSerializer, FindingTypeSerializer, ChemicalSerializer,
    MediaPreparationSerializer, ContaminationMonitoringSerializer,
    ContaminationReportSerializer, InoculationRoomSerializer,
    GrowthRoomSerializer, GreenhouseSerializer,
    ContaminationReportSerializer, InoculationRoomSerializer,
    GrowthRoomSerializer, GreenhouseSerializer,
    UserProfileSerializer, RecentActivitySerializer,
    MediaChemicalRequirementSerializer, ChemicalUsageLogSerializer,
    StockSolutionSerializer, StockSolutionPreparationSerializer
)


# ============================================
# AUTH VIEWS
# ============================================



class EntraLoginView(APIView):
    """
    POST /api/auth/entra-login/
    Body: {"id_token": "ey..."}
    Returns: access token, refresh token, and user info (provisions user if new)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import base64
        import json
        
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'error': 'id_token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Simple decoding of the JWT payload
            parts = id_token.split('.')
            if len(parts) != 3:
                return Response({'error': 'Invalid id_token format'}, status=status.HTTP_400_BAD_REQUEST)
                
            padding = (4 - len(parts[1]) % 4) % 4
            payload_padded = parts[1] + '=' * padding
            payload_json = base64.urlsafe_b64decode(payload_padded).decode('utf-8')
            payload = json.loads(payload_json)
            
            # Print the payload to the Django console for debugging
            print("\n=== MSAL TOKEN PAYLOAD ===")
            print(json.dumps(payload, indent=2))
            print("==========================\n")
            
        except Exception as e:
            return Response({'error': 'Failed to decode id_token'}, status=status.HTTP_400_BAD_REQUEST)

        email = payload.get('preferred_username') or payload.get('email')
        if not email:
            return Response({'error': 'No email found in id_token'}, status=status.HTTP_400_BAD_REQUEST)

        email = email.lower()
        name = payload.get('name', '')
        
        name_parts = name.split(' ', 1)
        first_name = name_parts[0] if name_parts else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Map Azure App Roles to our local roles
        # Convert all incoming roles to lowercase to handle "Admin" vs "admin" mismatches
        entra_roles = [str(r).lower() for r in payload.get('roles', [])]
        assigned_role = 'viewer'  # Default fallback
        
        # Priority mapping (if a user has multiple roles, give them the highest privilege)
        if 'admin' in entra_roles:
            assigned_role = 'admin'
        elif 'technician' in entra_roles:
            assigned_role = 'technician'
        elif 'viewer' in entra_roles:
            assigned_role = 'viewer'

        # Seamless provisioning
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
                'last_name': last_name,
                'role': assigned_role,
                'status': 'active',
            }
        )
        
        if created:
            user.set_unusable_password()
            user.save()
        else:
            # Sync the role if it was updated in Azure Entra ID
            if user.role != assigned_role:
                user.role = assigned_role
                user.save(update_fields=['role'])

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



class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

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


class StockSolutionViewSet(viewsets.ModelViewSet):
    queryset = StockSolution.objects.all()
    serializer_class = StockSolutionSerializer
    permission_classes = [IsAdminOrTechnician]

class StockSolutionPreparationViewSet(viewsets.ModelViewSet):
    queryset = StockSolutionPreparation.objects.select_related('stock_solution', 'prepared_by').all()
    serializer_class = StockSolutionPreparationSerializer
    permission_classes = [IsAdminOrTechnician]

    def perform_create(self, serializer):
        with transaction.atomic():
            prep = serializer.save(prepared_by=self.request.user)
            
            # Increase stock solution volume
            stock_solution = prep.stock_solution
            stock_solution.remaining_volume += prep.volume_prepared
            stock_solution.save(update_fields=['remaining_volume'])

            # Handle chemical usages if any provided
            chemical_usages_data = self.request.data.get('chemical_usages', [])
            for usage_data in chemical_usages_data:
                chemical_id = usage_data.get('chemical')
                quantity_consumed = usage_data.get('quantity_consumed')
                
                if chemical_id and quantity_consumed:
                    chemical = Chemical.objects.get(id=chemical_id)
                    StockSolutionChemicalUsage.objects.create(
                        preparation=prep,
                        chemical=chemical,
                        quantity_consumed=quantity_consumed
                    )
                    chemical.remaining_stock -= type(chemical.remaining_stock)(str(quantity_consumed))
                    chemical.save(update_fields=['remaining_stock'])

class MediaPreparationViewSet(viewsets.ModelViewSet):
    queryset = MediaPreparation.objects.select_related('media_type', 'prepared_by').all()
    serializer_class = MediaPreparationSerializer
    permission_classes = [IsAdminOrTechnician]

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from decimal import Decimal

        with transaction.atomic():
            # ── Pre-flight: validate stock levels BEFORE saving anything ──────
            stock_usages_data = self.request.data.get('stock_usages', [])
            for usage_data in stock_usages_data:
                stock_solution_id = usage_data.get('stock_solution')
                volume_consumed = usage_data.get('volume_consumed')

                if stock_solution_id and volume_consumed:
                    # Lock the row so concurrent requests cannot double-deduct
                    try:
                        stock_solution = StockSolution.objects.select_for_update().get(id=stock_solution_id)
                    except StockSolution.DoesNotExist:
                        raise DRFValidationError(
                            {"stock_usages": f"Stock solution with id {stock_solution_id} does not exist."}
                        )

                    requested = Decimal(str(volume_consumed))
                    if requested <= 0:
                        raise DRFValidationError(
                            {"stock_usages": f"Volume consumed must be greater than zero (got {requested})."}
                        )

                    if stock_solution.remaining_volume < requested:
                        raise DRFValidationError({
                            "stock_usages": (
                                f"Insufficient stock for '{stock_solution.name}'. "
                                f"Available: {stock_solution.remaining_volume} mL, "
                                f"Requested: {requested} mL."
                            )
                        })

            # ── All checks passed — save media prep and deduct stock ──────────
            media_prep = serializer.save(prepared_by=self.request.user)

            for usage_data in stock_usages_data:
                stock_solution_id = usage_data.get('stock_solution')
                volume_consumed = usage_data.get('volume_consumed')

                if stock_solution_id and volume_consumed:
                    stock_solution = StockSolution.objects.select_for_update().get(id=stock_solution_id)
                    requested = Decimal(str(volume_consumed))

                    MediaStockUsage.objects.create(
                        media_preparation=media_prep,
                        stock_solution=stock_solution,
                        volume_consumed=requested,
                    )
                    stock_solution.remaining_volume -= requested
                    stock_solution.save(update_fields=['remaining_volume'])
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


class RecentActivityViewSet(viewsets.ModelViewSet):
    queryset = RecentActivity.objects.select_related('user').all()
    serializer_class = RecentActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ============================================
# CHEMICAL <-> MEDIA PREPARATION VIEWSETS
# ============================================
class MediaChemicalRequirementViewSet(viewsets.ModelViewSet):
    serializer_class = MediaChemicalRequirementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MediaChemicalRequirement.objects.select_related('media_type', 'chemical').all()
        media_type = self.request.query_params.get('media_type')
        if media_type:
            qs = qs.filter(media_type_id=media_type)
        return qs


class ChemicalUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChemicalUsageLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ChemicalUsageLog.objects.select_related('chemical', 'media_preparation').all()
        media_preparation = self.request.query_params.get('media_preparation')
        chemical = self.request.query_params.get('chemical')
        if media_preparation:
            qs = qs.filter(media_preparation_id=media_preparation)
        if chemical:
            qs = qs.filter(chemical_id=chemical)
        return qs.order_by('-timestamp')


# ============================================
# DASHBOARD API
# ============================================
class TriggerWeeklyDigestView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        from core.tasks import send_weekly_lab_digest
        result = send_weekly_lab_digest.apply()
        if result.status == 'SUCCESS':
            return Response({'detail': result.result}, status=status.HTTP_200_OK)
        return Response({'detail': str(result.result)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TriggerChemicalExpiryDigestView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        from core.tasks import send_chemical_expiry_digest
        result = send_chemical_expiry_digest.apply()
        if result.status == 'SUCCESS':
            return Response({'detail': result.result}, status=status.HTTP_200_OK)
        return Response({'detail': str(result.result)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


# ============================================
# AI ASSISTANT VIEW  (LangChain ReAct Agent)
# ============================================
class AIAssistantView(APIView):
    """
    POST /api/ai-assistant/
    Body:    { "message": "natural language question" }
    Returns: { "reply": "agent's answer" }

    Uses a LangChain ReAct agent with 17 read-only tools to answer
    natural language questions about the live DCM LabNest database.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from core.agent.agent import build_agent

        message = (request.data.get('message') or '').strip()
        if not message:
            return Response(
                {'error': 'message is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, 'DEEPSEEK_API_KEY', '')
        if not api_key:
            return Response(
                {'error': 'AI service is not configured. Contact the administrator.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from langchain_core.messages import SystemMessage

            user = request.user
            user_context = SystemMessage(content=(
                f"The currently logged-in user is: {user.get_full_name() or user.username} "
                f"(email: {user.email}). "
                f"When sending any report or alert email, ALWAYS use '{user.email}' "
                f"as the recipient_email argument. Do not ask the user for their email."
            ))

            agent = build_agent(verbose=True)
            result = agent.invoke({
                "input": message,
                "chat_history": [user_context],
            })
            reply = result.get('output') or 'I was unable to generate a response. Please try again.'
            return Response({'reply': reply})

        except Exception as exc:
            return Response(
                {'error': f'Agent error: {str(exc)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

# Trigger auto-reloader
