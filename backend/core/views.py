from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import models, transaction
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.core import signing
from datetime import timedelta

from django.core.mail import send_mail
from django.conf import settings
import random
import string

from .models import (
    User, Variety, Chemical,
    InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog,
    RecentActivity,
    StockSolution, StockSolutionPreparation, StockSolutionChemicalUsage, StockSolutionRecipeItem,
    ExpenseCategory, Expense
)
from .serializers import (
    UserSerializer, UserCreateSerializer, UserRoleUpdateSerializer,
    VarietySerializer, ChemicalSerializer,
    InitiationLogSerializer, MultiplicationLogSerializer,
    RootingLogSerializer, HardeningLogSerializer, TransplantationLogSerializer,
    UserProfileSerializer, RecentActivitySerializer,
    StockSolutionSerializer, StockSolutionPreparationSerializer, StockSolutionRecipeItemSerializer,
    ExpenseCategorySerializer, ExpenseSerializer
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
                'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
            }
        })





from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class ProfileView(APIView):
    """
    GET  /api/auth/profile/  - Get current user profile
    PUT  /api/auth/profile/  - Full update of editable profile fields
    PATCH /api/auth/profile/ - Partial update (username, first_name, last_name, profile_picture)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=False, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True, context={'request': request}
        )
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
    """
    Admin-only viewset for user management.
    GET    /api/users/                     → list all users (supports ?role=&status=&search=)
    GET    /api/users/{id}/               → single user detail
    POST   /api/users/                     → create user
    PATCH  /api/users/{id}/update-role/   → update role + status only
    DELETE /api/users/{id}/               → soft delete (sets status=inactive)
    """
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        if role:
            qs = qs.filter(role=role)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(username__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action == 'update_role':
            return UserRoleUpdateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft delete: set status to inactive instead of deleting the record."""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'You cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.status = 'inactive'
        user.save(update_fields=['status'])
        return Response({'detail': f'{user.email} has been deactivated.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='update-role', permission_classes=[IsAdminUser])
    def update_role(self, request, pk=None):
        """
        PATCH /api/users/{id}/update-role/
        Body: { "role": "technician" }  or  { "status": "inactive" }  or both.
        """
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'You cannot change your own role.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = UserRoleUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user, context={'request': request}).data)

class VarietyViewSet(viewsets.ModelViewSet):
    queryset = Variety.objects.all()
    serializer_class = VarietySerializer
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
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from decimal import Decimal

        with transaction.atomic():
            # The technician only inputs volume_prepared
            volume_prepared = Decimal(str(self.request.data.get('volume_prepared', 0)))
            if volume_prepared <= 0:
                raise DRFValidationError({"volume_prepared": "Volume must be greater than zero."})

            stock_solution_id = self.request.data.get('stock_solution')
            if not stock_solution_id:
                raise DRFValidationError({"stock_solution": "Stock solution is required."})

            try:
                stock_solution = StockSolution.objects.select_for_update().get(id=stock_solution_id)
            except StockSolution.DoesNotExist:
                raise DRFValidationError({"stock_solution": "Invalid stock solution."})

            # Fetch the recipe
            recipe_items = StockSolutionRecipeItem.objects.filter(stock_solution=stock_solution).select_related('chemical')
            
            # Pre-flight check: do we have enough raw chemicals?
            for item in recipe_items:
                required_amount = (volume_prepared / stock_solution.base_volume) * item.quantity_per_unit
                # Lock chemical row to avoid race conditions
                chemical = Chemical.objects.select_for_update().get(id=item.chemical.id)
                if chemical.remaining_stock < required_amount:
                    raise DRFValidationError(
                        f"Insufficient stock for '{chemical.name}'. "
                        f"Required: {required_amount} {chemical.unit}, "
                        f"Available: {chemical.remaining_stock} {chemical.unit}."
                    )

            # Pre-flight checks passed, save preparation
            prep = serializer.save(prepared_by=self.request.user)

            # Deduct chemicals and create usage logs
            for item in recipe_items:
                required_amount = (volume_prepared / stock_solution.base_volume) * item.quantity_per_unit
                chemical = Chemical.objects.select_for_update().get(id=item.chemical.id)
                
                # Deduct inventory
                chemical.remaining_stock -= required_amount
                chemical.save(update_fields=['remaining_stock'])

                # Log usage
                StockSolutionChemicalUsage.objects.create(
                    preparation=prep,
                    chemical=chemical,
                    quantity_consumed=required_amount
                )

            # Increase stock solution inventory
            stock_solution.remaining_volume += volume_prepared
            stock_solution.save(update_fields=['remaining_volume'])
class InitiationLogViewSet(viewsets.ModelViewSet):
    queryset = InitiationLog.objects.select_related('variety', 'technician').all()
    serializer_class = InitiationLogSerializer
    permission_classes = [IsAdminOrTechnician]
    def perform_create(self, serializer):
        serializer.save(technician=self.request.user)

class MultiplicationLogViewSet(viewsets.ModelViewSet):
    queryset = MultiplicationLog.objects.select_related('variety', 'technician').all()
    serializer_class = MultiplicationLogSerializer
    permission_classes = [IsAdminOrTechnician]
    def perform_create(self, serializer):
        serializer.save(technician=self.request.user)

class RootingLogViewSet(viewsets.ModelViewSet):
    queryset = RootingLog.objects.select_related('variety', 'technician').all()
    serializer_class = RootingLogSerializer
    permission_classes = [IsAdminOrTechnician]
    def perform_create(self, serializer):
        serializer.save(technician=self.request.user)

class HardeningLogViewSet(viewsets.ModelViewSet):
    queryset = HardeningLog.objects.select_related('variety', 'technician').all()
    serializer_class = HardeningLogSerializer
    permission_classes = [IsAdminOrTechnician]
    def perform_create(self, serializer):
        serializer.save(technician=self.request.user)

class TransplantationLogViewSet(viewsets.ModelViewSet):
    queryset = TransplantationLog.objects.select_related('variety', 'technician').all()
    serializer_class = TransplantationLogSerializer
    permission_classes = [IsAdminOrTechnician]
    def perform_create(self, serializer):
        serializer.save(technician=self.request.user)

class RecentActivityViewSet(viewsets.ModelViewSet):
    queryset = RecentActivity.objects.select_related('user').all()
    serializer_class = RecentActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StockSolutionRecipeItemViewSet(viewsets.ModelViewSet):
    serializer_class = StockSolutionRecipeItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StockSolutionRecipeItem.objects.select_related('stock_solution', 'chemical').all()
        stock_solution = self.request.query_params.get('stock_solution')
        if stock_solution:
            qs = qs.filter(stock_solution_id=stock_solution)
        return qs


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
        days = int(request.query_params.get('days', 0))
        if days > 0:
            start_date = timezone.now().date() - timedelta(days=days)
        else:
            from datetime import date
            start_date = date(2000, 1, 1)
        
        from django.db.models import F, Q
        from core.models import Chemical
        import duckdb
        import os
        from django.conf import settings
        
        # 1. Low stock chemicals (keep querying live MySQL since it's real-time inventory count)
        low_stock_chemicals = Chemical.objects.filter(
            Q(remaining_stock__lte=F('quantity') * 0.3) | Q(remaining_stock__lte=15)
        ).count()
        
        db_path = os.path.join(settings.BASE_DIR, 'lab_analytics', 'analytics.duckdb')
        start_date_str = start_date.strftime("%Y-%m-%d")
        
        # Initialize default response structures
        init_prod = init_cont = mult_prod = mult_cont = root_prod = root_cont = 0
        hard_prod = hard_died = trans_prod = trans_died = 0
        total_cost = 0.0
        variety_distribution = []
        variety_success = []
        production_trend = []
        contamination_trend = []
        
        # Helper to convert duckdb dates to string format
        def _fmt_date(d):
            if hasattr(d, 'strftime'):
                return d.strftime("%Y-%m-%d")
            return str(d)

        # Flag to track if we successfully loaded from DuckDB
        duckdb_success = False
        
        if os.path.exists(db_path):
            try:
                con = duckdb.connect(database=db_path, read_only=True)
                
                # A. Stage Rollup
                stage_rows = con.execute(f"""
                    SELECT stage, SUM(produced_count), SUM(lost_count)
                    FROM daily_stage_rollup
                    WHERE date >= '{start_date_str}'
                    GROUP BY stage
                """).fetchall()
                
                stages = {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in stage_rows}
                
                init_prod, init_cont = stages.get('Initiation', (0, 0))
                mult_prod, mult_cont = stages.get('Multiplication', (0, 0))
                root_prod, root_cont = stages.get('Rooting', (0, 0))
                hard_prod, hard_died = stages.get('Hardening', (0, 0))
                trans_prod, trans_died = stages.get('Transplantation', (0, 0))
                
                # B. Financials (Total Cost)
                cost_res = con.execute(f"SELECT SUM(total_cost) FROM financials_rollup WHERE date >= '{start_date_str}'").fetchone()
                total_cost = float(cost_res[0] or 0.0)
                
                # C. Variety Distribution
                dist_rows = con.execute(f"""
                    SELECT v.code, SUM(r.produced_count)
                    FROM daily_stage_rollup r
                    JOIN variety_mappings v ON r.variety_id = v.id
                    WHERE r.stage = 'Transplantation' AND r.date >= '{start_date_str}'
                    GROUP BY v.code
                    ORDER BY 2 DESC
                """).fetchall()
                variety_distribution = [{"name": row[0], "value": int(row[1] or 0)} for row in dist_rows]
                
                # D. Variety Success Rate
                var_success_rows = con.execute(f"""
                    SELECT v.code, SUM(r.produced_count), SUM(r.lost_count)
                    FROM daily_stage_rollup r
                    JOIN variety_mappings v ON r.variety_id = v.id
                    WHERE r.date >= '{start_date_str}'
                    GROUP BY v.code
                """).fetchall()
                
                for row in var_success_rows:
                    v_code = row[0]
                    v_started = int(row[1] or 0)
                    v_lost = int(row[2] or 0)
                    if v_started > 0:
                        rate = ((v_started - v_lost) / v_started) * 100
                        variety_success.append({
                            "variety": v_code,
                            "successRate": round(rate, 2)
                        })
                        
                # E. Production Trend (Transplantation output)
                trend_rows = con.execute(f"""
                    SELECT date, SUM(produced_count)
                    FROM daily_stage_rollup
                    WHERE stage = 'Transplantation' AND date >= '{start_date_str}'
                    GROUP BY date
                    ORDER BY date
                """).fetchall()
                production_trend = [{"date": _fmt_date(row[0]), "total": int(row[1] or 0)} for row in trend_rows]
                
                # F. Contamination Trend (Initiation, Multiplication, Rooting)
                cont_rows = con.execute(f"""
                    SELECT date, SUM(lost_count)
                    FROM daily_stage_rollup
                    WHERE stage IN ('Initiation', 'Multiplication', 'Rooting') AND date >= '{start_date_str}'
                    GROUP BY date
                    ORDER BY date
                """).fetchall()
                contamination_trend = [{"date": _fmt_date(row[0]), "cases": int(row[1] or 0)} for row in cont_rows]
                
                con.close()
                duckdb_success = True
            except Exception as e:
                # Log error and fallback to Django ORM
                import logging
                logging.getLogger(__name__).error(f"Error querying DuckDB: {e}")
                duckdb_success = False

        if not duckdb_success:
            # === FALLBACK TO DJANGO ORM ===
            from django.db.models import Sum
            from django.db.models.functions import TruncMonth, TruncDay
            from core.models import StockSolutionChemicalUsage, Expense, Variety
            
            init_logs = InitiationLog.objects.filter(date__gte=start_date)
            mult_logs = MultiplicationLog.objects.filter(date__gte=start_date)
            root_logs = RootingLog.objects.filter(date__gte=start_date)
            hard_logs = HardeningLog.objects.filter(date__gte=start_date)
            trans_logs = TransplantationLog.objects.filter(date__gte=start_date)

            init_prod = init_logs.aggregate(s=Sum('bottles_inoculated'))['s'] or 0
            init_cont = init_logs.aggregate(s=Sum('contaminated_bottles'))['s'] or 0
            
            mult_prod = mult_logs.aggregate(s=Sum('bottles_produced'))['s'] or 0
            mult_cont = mult_logs.aggregate(s=Sum('contaminated_bottles'))['s'] or 0
            
            root_prod = root_logs.aggregate(s=Sum('rooting_bottles'))['s'] or 0
            root_cont = root_logs.aggregate(s=Sum('contaminated_bottles'))['s'] or 0
            
            hard_prod = hard_logs.aggregate(s=Sum('seedlings_transplanted'))['s'] or 0
            hard_died = hard_logs.aggregate(s=Sum('seedlings_died'))['s'] or 0
            
            trans_prod = trans_logs.aggregate(s=Sum('seedlings_transplanted'))['s'] or 0
            trans_died = trans_logs.aggregate(s=Sum('seedlings_died'))['s'] or 0

            # Cost
            total_indirect = Expense.objects.filter(date__gte=start_date).aggregate(s=Sum('amount'))['s'] or 0
            chem_usages = StockSolutionChemicalUsage.objects.filter(preparation__date__gte=start_date)
            total_chem_cost = sum([float(u.quantity_consumed) * float(u.chemical.unit_price) for u in chem_usages.select_related('chemical')])
            total_cost = float(total_indirect) + total_chem_cost

            # Variety success
            variety_success = []
            varieties = Variety.objects.all()
            for v in varieties:
                v_started = (
                    (InitiationLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('bottles_inoculated'))['s'] or 0) +
                    (MultiplicationLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('bottles_produced'))['s'] or 0) +
                    (RootingLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('rooting_bottles'))['s'] or 0) +
                    (HardeningLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('seedlings_transplanted'))['s'] or 0) +
                    (TransplantationLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('seedlings_transplanted'))['s'] or 0)
                )
                v_lost = (
                    (InitiationLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('contaminated_bottles'))['s'] or 0) +
                    (MultiplicationLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('contaminated_bottles'))['s'] or 0) +
                    (RootingLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('contaminated_bottles'))['s'] or 0) +
                    (HardeningLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('seedlings_died'))['s'] or 0) +
                    (TransplantationLog.objects.filter(variety=v, date__gte=start_date).aggregate(s=Sum('seedlings_died'))['s'] or 0)
                )
                if v_started > 0:
                    rate = ((v_started - v_lost) / v_started) * 100
                    variety_success.append({
                        "variety": v.code,
                        "successRate": round(rate, 2)
                    })

            # Variety distribution
            variety_distribution = list(
                trans_logs.values(name=F('variety__code')).annotate(value=Sum('seedlings_transplanted')).order_by('-value')
            )

            # Trends
            trunc_func = TruncDay if days <= 31 else TruncMonth
            production_trend_qs = trans_logs.annotate(period=trunc_func('date')).values('period').annotate(total=Sum('seedlings_transplanted')).order_by('period')
            production_trend = [{"date": pt['period'].strftime("%Y-%m-%d"), "total": pt['total']} for pt in production_trend_qs]

            cont_init = list(init_logs.annotate(period=trunc_func('date')).values('period').annotate(c=Sum('contaminated_bottles')))
            cont_mult = list(mult_logs.annotate(period=trunc_func('date')).values('period').annotate(c=Sum('contaminated_bottles')))
            cont_root = list(root_logs.annotate(period=trunc_func('date')).values('period').annotate(c=Sum('contaminated_bottles')))
            
            cont_dict = {}
            for c_list in [cont_init, cont_mult, cont_root]:
                for item in c_list:
                    period_str = item['period'].strftime("%Y-%m-%d")
                    cont_dict[period_str] = cont_dict.get(period_str, 0) + item['c']
            contamination_trend = [{"date": k, "cases": v} for k, v in sorted(cont_dict.items())]

        # Calculate shared metrics
        cost_per_plantlet = 0.0
        if trans_prod > 0:
            cost_per_plantlet = total_cost / trans_prod

        overall_success_rate = 0.0
        total_started = init_prod + mult_prod + root_prod + hard_prod + trans_prod
        total_lost = init_cont + mult_cont + root_cont + hard_died + trans_died
        if total_started > 0:
            overall_success_rate = ((total_started - total_lost) / total_started) * 100

        production_pipeline = [
            {"stage": "Initiation", "count": init_prod},
            {"stage": "Multiplication", "count": mult_prod},
            {"stage": "Rooting", "count": root_prod},
            {"stage": "Hardening", "count": hard_prod},
            {"stage": "Transplantation", "count": trans_prod},
        ]

        contamination_by_stage = [
            {"name": "Initiation", "size": init_cont},
            {"name": "Multiplication", "size": mult_cont},
            {"name": "Rooting", "size": root_cont},
            {"name": "Hardening (Mortality)", "size": hard_died},
            {"name": "Transplantation (Mortality)", "size": trans_died},
        ]
        contamination_by_stage = [c for c in contamination_by_stage if c["size"] > 0]

        return Response({
            'stats': {
                'low_stock_chemicals': low_stock_chemicals,
                'total_production': trans_prod,
                'total_cost': total_cost,
                'cost_per_plantlet': round(cost_per_plantlet, 2),
                'overall_success_rate': round(overall_success_rate, 2),
                'total_contamination': total_lost,
            },
            'variety_distribution': variety_distribution,
            'success_rate_per_variety': variety_success,
            'production_pipeline': production_pipeline,
            'production_trend': production_trend,
            'contamination_by_stage': contamination_by_stage,
            'contamination_trend': contamination_trend,
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

# ============================================
# EXPENSE TRACKING VIEWS
# ============================================
class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    # Only admins can edit categories, but all authenticated users can view them
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import BasePermission
            class IsAdminUser(BasePermission):
                def has_permission(self, request, view):
                    return bool(request.user and request.user.role == 'admin')
            return [IsAdminUser()]
        return super().get_permissions()

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().select_related('category', 'recorded_by')
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import BasePermission
            class IsAdminUser(BasePermission):
                def has_permission(self, request, view):
                    return bool(request.user and request.user.role == 'admin')
            return [IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

# Trigger auto-reloader
