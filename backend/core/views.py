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
    ExpenseCategory, Expense, ManpowerExpense,
    FieldLocation, Plot, FieldManager, Farmer, SeedLot, SeedLotTransaction
)
from .serializers import (
    UserSerializer, UserCreateSerializer, UserRoleUpdateSerializer,
    VarietySerializer, ChemicalSerializer,
    InitiationLogSerializer, MultiplicationLogSerializer,
    RootingLogSerializer, HardeningLogSerializer, TransplantationLogSerializer,
    UserProfileSerializer, RecentActivitySerializer,
    StockSolutionSerializer, StockSolutionPreparationSerializer, StockSolutionRecipeItemSerializer,
    ExpenseCategorySerializer, ExpenseSerializer, ManpowerExpenseSerializer,
    FieldLocationSerializer, PlotSerializer, FieldManagerSerializer, FarmerSerializer,
    SeedLotSerializer, SeedLotTransactionSerializer
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
            # Only sync role from Entra when it actually sent app roles - otherwise
            # this would silently overwrite roles assigned locally via admin approval.
            if entra_roles and user.role != assigned_role:
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
                'is_onboarded': user.is_onboarded,
                'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
            }
        })


class PendingUsersView(APIView):
    """
    GET /api/auth/admin/pending-users/
    Returns all users who have signed in but have not yet been approved (is_onboarded=False).
    Admin-only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can view pending users.'},
                status=status.HTTP_403_FORBIDDEN
            )

        pending = User.objects.filter(is_onboarded=False).order_by('-date_joined')
        users_data = [
            {
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'email': u.email,
                'role': u.role,
                'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M'),
            }
            for u in pending
        ]
        return Response({'pending_users': users_data, 'count': len(users_data)})


class AdminApproveUserView(APIView):
    """
    POST /api/auth/admin/approve-user/
    Body: {"user_id": 5, "role": "technician"}
    Admin-only. Approves a pending user by setting their role and is_onboarded=True.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can approve users.'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        role = request.data.get('role')

        if not user_id:
            return Response(
                {'error': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if role not in ('technician', 'admin'):
            return Response(
                {'error': 'Invalid role. Choose "technician" or "admin".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': f'User with id {user_id} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        target_user.role = role
        target_user.is_onboarded = True
        target_user.save(update_fields=['role', 'is_onboarded'])

        return Response({
            'message': f'{target_user.get_full_name() or target_user.username} has been approved as {role}.',
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'first_name': target_user.first_name,
                'last_name': target_user.last_name,
                'email': target_user.email,
                'role': target_user.role,
                'is_onboarded': target_user.is_onboarded,
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
        from django.db import transaction
        from core.models import SeedLot, SeedLotTransaction
        with transaction.atomic():
            instance = serializer.save(technician=self.request.user)
            field_lot_id = serializer.validated_data.get('field_lot_id')
            if field_lot_id:
                custom_plot_id = self.request.data.get('custom_plot_id', '')
                custom_coordinates = self.request.data.get('custom_coordinates', '')
                
                # Construct a lab batch reference using date and instance ID since there's no explicit batch_id
                lab_ref = f"LAB-{instance.date.strftime('%Y%m%d')}-{instance.id}"
                
                # Automatically create the root FieldLink Breeder SeedLot
                seed_lot = SeedLot.objects.create(
                    lot_id=field_lot_id,
                    stage='breeder',
                    variety=instance.variety,
                    quantity_kg=instance.seedlings_transplanted,
                    season_year=instance.date.year,
                    status='in_field',
                    farmer=instance.farmer,
                    location=instance.location,
                    custom_plot_id=custom_plot_id,
                    custom_coordinates=custom_coordinates,
                    lab_batch_reference=lab_ref,
                    notes=f"Auto-generated from LabNest Transplantation (Ref: {lab_ref})",
                    created_by=self.request.user,
                )
                SeedLotTransaction.objects.create(
                    seed_lot=seed_lot,
                    txn_type='dispatch',
                    quantity_kg=0,
                    farmer=instance.farmer,
                    location=instance.location,
                    notes=f"Dispatched from LabNest. Ref: {lab_ref}",
                    recorded_by=self.request.user,
                )

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
        from datetime import date as _date
        from django.db.models import F, Q, Sum
        from django.db.models.functions import TruncMonth, TruncDay
        from core.models import Chemical, StockSolutionChemicalUsage, Expense, Variety
        import duckdb
        import os
        from django.conf import settings

        today = timezone.now().date()

        # ── Date range resolution (priority: from_date/to_date > days > all-time) ──
        from_date_str = request.query_params.get('from_date')
        to_date_str   = request.query_params.get('to_date')
        days_param    = int(request.query_params.get('days', 0))

        if from_date_str and to_date_str:
            start_date = _date.fromisoformat(from_date_str)
            end_date   = _date.fromisoformat(to_date_str)
        elif days_param > 0:
            start_date = today - timedelta(days=days_param)
            end_date   = today
        else:
            start_date = _date(2000, 1, 1)
            end_date   = today

        days = max(1, (end_date - start_date).days)  # number of days in selected range

        # 1. Low stock chemicals (always real-time)
        low_stock_chemicals = Chemical.objects.filter(
            Q(remaining_stock__lte=F('quantity') * 0.3) | Q(remaining_stock__lte=15)
        ).count()

        db_path = os.path.join(settings.BASE_DIR, 'lab_analytics', 'analytics.duckdb')
        start_date_str = start_date.strftime("%Y-%m-%d")
        end_date_str   = end_date.strftime("%Y-%m-%d")
        
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
                    WHERE date >= '{start_date_str}' AND date <= '{end_date_str}'
                    GROUP BY stage
                """).fetchall()

                stages = {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in stage_rows}

                init_prod, init_cont = stages.get('Initiation', (0, 0))
                mult_prod, mult_cont = stages.get('Multiplication', (0, 0))
                root_prod, root_cont = stages.get('Rooting', (0, 0))
                hard_prod, hard_died = stages.get('Hardening', (0, 0))
                trans_prod, trans_died = stages.get('Transplantation', (0, 0))

                # B. Financials (Total Cost)
                cost_res = con.execute(f"""
                    SELECT SUM(total_cost) FROM financials_rollup
                    WHERE date >= '{start_date_str}' AND date <= '{end_date_str}'
                """).fetchone()
                total_cost = float(cost_res[0] or 0.0)

                # C. Variety Distribution
                dist_rows = con.execute(f"""
                    SELECT v.code, SUM(r.produced_count)
                    FROM daily_stage_rollup r
                    JOIN variety_mappings v ON r.variety_id = v.id
                    WHERE r.stage = 'Transplantation'
                      AND r.date >= '{start_date_str}' AND r.date <= '{end_date_str}'
                    GROUP BY v.code
                    ORDER BY 2 DESC
                """).fetchall()
                variety_distribution = [{"name": row[0], "value": int(row[1] or 0)} for row in dist_rows]

                # D. Variety Success Rate
                var_success_rows = con.execute(f"""
                    SELECT v.code, SUM(r.produced_count), SUM(r.lost_count)
                    FROM daily_stage_rollup r
                    JOIN variety_mappings v ON r.variety_id = v.id
                    WHERE r.date >= '{start_date_str}' AND r.date <= '{end_date_str}'
                    GROUP BY v.code
                """).fetchall()

                for row in var_success_rows:
                    v_code = row[0]
                    v_started = int(row[1] or 0)
                    v_lost = int(row[2] or 0)
                    if v_started > 0:
                        rate = ((v_started - v_lost) / v_started) * 100
                        variety_success.append({"variety": v_code, "successRate": round(rate, 2)})

                # E. Production Trend
                trend_rows = con.execute(f"""
                    SELECT date, SUM(produced_count)
                    FROM daily_stage_rollup
                    WHERE stage = 'Transplantation'
                      AND date >= '{start_date_str}' AND date <= '{end_date_str}'
                    GROUP BY date ORDER BY date
                """).fetchall()
                production_trend = [{"date": _fmt_date(row[0]), "total": int(row[1] or 0)} for row in trend_rows]

                # F. Contamination Trend
                cont_rows = con.execute(f"""
                    SELECT date, SUM(lost_count)
                    FROM daily_stage_rollup
                    WHERE stage IN ('Initiation', 'Multiplication', 'Rooting')
                      AND date >= '{start_date_str}' AND date <= '{end_date_str}'
                    GROUP BY date ORDER BY date
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
            init_logs  = InitiationLog.objects.filter(date__gte=start_date, date__lte=end_date)
            mult_logs  = MultiplicationLog.objects.filter(date__gte=start_date, date__lte=end_date)
            root_logs  = RootingLog.objects.filter(date__gte=start_date, date__lte=end_date)
            hard_logs  = HardeningLog.objects.filter(date__gte=start_date, date__lte=end_date)
            trans_logs = TransplantationLog.objects.filter(date__gte=start_date, date__lte=end_date)

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
            total_indirect = Expense.objects.filter(date__gte=start_date, date__lte=end_date).aggregate(s=Sum('amount'))['s'] or 0
            chem_usages = StockSolutionChemicalUsage.objects.filter(preparation__date__gte=start_date, preparation__date__lte=end_date)
            total_chem_cost = sum([float(u.quantity_consumed) * float(u.chemical.unit_price) for u in chem_usages.select_related('chemical')])
            # Note: manpower salary added at shared merge point below
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

        # ── MANPOWER SALARY COST ─────────────────────────────────────────────
        # Runs after both DuckDB and ORM paths — always included.
        # effective_days = days in selected range that overlap with when the salary existed.
        salary_records = ManpowerExpense.objects.all()
        total_salary_cost = 0.0
        for record in salary_records:
            # Salary only valid from when it was first recorded
            effective_start = max(start_date, record.created_at.date())
            effective_days  = max(0, (end_date - effective_start).days + 1)
            total_salary_cost += record.daily_rate * effective_days
        total_cost += total_salary_cost

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

        # ── COST BREAKDOWN (always from ORM — accurate, real-time) ───────────
        chem_usages_all = StockSolutionChemicalUsage.objects.filter(
            preparation__date__gte=start_date, preparation__date__lte=end_date
        ).select_related('chemical')
        cost_chemicals = sum(
            float(u.quantity_consumed) * float(u.chemical.unit_price)
            for u in chem_usages_all
        )
        cost_other = float(
            Expense.objects.filter(date__gte=start_date, date__lte=end_date).aggregate(s=Sum('amount'))['s'] or 0
        )
        cost_manpower = round(total_salary_cost, 2)

        return Response({
            'stats': {
                'low_stock_chemicals': low_stock_chemicals,
                'total_production': trans_prod,
                'total_cost': round(total_cost, 2),
                'cost_per_plantlet': round(cost_per_plantlet, 2),
                'overall_success_rate': round(overall_success_rate, 2),
                'total_contamination': total_lost,
                'date_range': {
                    'from': start_date.strftime('%Y-%m-%d'),
                    'to': end_date.strftime('%Y-%m-%d'),
                    'days': days,
                },
                'cost_breakdown': {
                    'chemicals': round(cost_chemicals, 2),
                    'manpower': round(cost_manpower, 2),
                    'other': round(cost_other, 2),
                },
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

    Uses a LangChain ReAct agent with 43 read-only tools to answer
    natural language questions about the live DCM LabNest and FieldLink Module.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from core.tasks import run_llm_agent_task
        from celery.exceptions import TimeoutError as CeleryTimeoutError
        from datetime import date

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
            user = request.user
            today_str = date.today().isoformat()
            thread_id = f"user_{user.id}_session_{today_str}"

            # Dispatch to Celery worker via Redis message queue.
            # The worker retries with exponential back-off on failure.
            async_result = run_llm_agent_task.apply_async(
                kwargs={
                    "user_id": user.id,
                    "user_full_name": user.get_full_name() or user.username,
                    "user_email": user.email,
                    "user_role": getattr(user, 'role', 'viewer'),
                    "message": message,
                    "thread_id": thread_id,
                }
            )

            # Block this request thread until the worker finishes (max 120 s).
            # This preserves the existing { "reply": "..." } response contract
            # without requiring any frontend changes.
            reply = async_result.get(timeout=120, propagate=True)
            return Response({'reply': reply})

        except CeleryTimeoutError:
            return Response(
                {'error': 'The request timed out. The agent is still processing — please try again shortly.'},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
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

# ============================================
# MANPOWER EXPENSE VIEWS
# ============================================
class ManpowerExpenseViewSet(viewsets.ModelViewSet):
    """
    Admin-only viewset for technician salary management.
    One record per technician — edit to update salary, never re-enter per month.
    """
    serializer_class = ManpowerExpenseSerializer
    permission_classes = [IsAdminUser]
    queryset = ManpowerExpense.objects.select_related('technician', 'recorded_by').all()

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(recorded_by=self.request.user)

    def list(self, request, *args, **kwargs):
        """Returns all salary records plus summary totals."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        total_monthly = sum(float(r.monthly_salary) for r in queryset)
        total_daily = sum(r.daily_rate for r in queryset)
        return Response({
            'results': serializer.data,
            'count': queryset.count(),
            'total_monthly_payroll': round(total_monthly, 2),
            'total_daily_cost': round(total_daily, 4),
        })


# ============================================
# FIELDLINK VIEWSETS
# ============================================

class FieldLocationViewSet(viewsets.ModelViewSet):
    """CRUD for field locations (Ajbapur, Rupapur, etc.)"""
    queryset = FieldLocation.objects.prefetch_related('plots').all()
    serializer_class = FieldLocationSerializer
    permission_classes = [permissions.IsAuthenticated]


class PlotViewSet(viewsets.ModelViewSet):
    """CRUD for individual plots within a location."""
    serializer_class = PlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Plot.objects.select_related('location').all()
        location_id = self.request.query_params.get('location')
        if location_id:
            qs = qs.filter(location_id=location_id)
        return qs


class FieldManagerViewSet(viewsets.ModelViewSet):
    """CRUD for field managers. Supports ?active=true filter."""
    serializer_class = FieldManagerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = FieldManager.objects.prefetch_related('farmers').all()
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)
        return qs


class FarmerViewSet(viewsets.ModelViewSet):
    """CRUD for contract farmers + computed yield metrics."""
    serializer_class = FarmerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Farmer.objects.select_related('primary_location', 'field_manager').prefetch_related('seedlottransaction_set').all()
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)
        manager_id = self.request.query_params.get('manager')
        if manager_id:
            qs = qs.filter(field_manager_id=manager_id)
        return qs


class SeedLotViewSet(viewsets.ModelViewSet):
    """CRUD for seed lots + custom actions for dispatch and harvest."""
    serializer_class = SeedLotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SeedLot.objects.select_related(
            'parent_lot', 'variety', 'location', 'plot', 'farmer', 'created_by'
        ).prefetch_related('child_lots', 'transactions').all()

        stage = self.request.query_params.get('stage')
        status = self.request.query_params.get('status')
        year = self.request.query_params.get('year')
        farmer_id = self.request.query_params.get('farmer')
        location_id = self.request.query_params.get('location')
        lot_id = self.request.query_params.get('lot_id')

        if stage: qs = qs.filter(stage=stage)
        if status: qs = qs.filter(status=status)
        if year: qs = qs.filter(season_year=year)
        if farmer_id: qs = qs.filter(farmer_id=farmer_id)
        if location_id: qs = qs.filter(location_id=location_id)
        if lot_id: qs = qs.filter(lot_id__icontains=lot_id)

        return qs

    @action(detail=True, methods=['post'], url_path='dispatch')
    def dispatch_to_farmer(self, request, pk=None):
        """POST /api/field/seed-lots/{id}/dispatch/ — assign lot to a farmer and log it."""
        lot = self.get_object()
        farmer_id = request.data.get('farmer_id')
        quantity_kg = request.data.get('quantity_kg')
        notes = request.data.get('notes', '')
        new_lot_id = request.data.get('new_lot_id')
        location_id = request.data.get('location')
        custom_plot_id = request.data.get('custom_plot_id')
        custom_coordinates = request.data.get('custom_coordinates')

        if lot.stage == 'commercial':
            # Commercial dispatch is a sale. No farmer assignment required.
            dispatch_qty = float(quantity_kg) if quantity_kg else float(lot.quantity_kg)
            with transaction.atomic():
                if dispatch_qty >= float(lot.quantity_kg):
                    lot.status = 'sold'
                    lot.save(update_fields=['status'])
                else:
                    lot.quantity_kg = float(lot.quantity_kg) - dispatch_qty
                    lot.save(update_fields=['quantity_kg'])
                
                SeedLotTransaction.objects.create(
                    seed_lot=lot,
                    txn_type='dispatch',
                    quantity_kg=dispatch_qty,
                    notes=notes or "Commercial sale",
                    recorded_by=request.user,
                )
            return Response(SeedLotSerializer(lot, context={'request': request}).data)

        # For non-commercial stages, we are dispatching to a farmer to grow.
        if not farmer_id:
            return Response({'error': 'farmer_id is required for non-commercial dispatch'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            farmer = Farmer.objects.get(id=farmer_id)
        except Farmer.DoesNotExist:
            return Response({'error': 'Farmer not found'}, status=status.HTTP_404_NOT_FOUND)

        dispatch_qty = float(quantity_kg) if quantity_kg else float(lot.quantity_kg)

        with transaction.atomic():
            if dispatch_qty < float(lot.quantity_kg):
                # Partial dispatch: split lot
                if not new_lot_id:
                    return Response({'error': 'new_lot_id is required for partial dispatch'}, status=status.HTTP_400_BAD_REQUEST)
                
                lot.quantity_kg = float(lot.quantity_kg) - dispatch_qty
                lot.save(update_fields=['quantity_kg'])

                new_lot = SeedLot.objects.create(
                    lot_id=new_lot_id,
                    stage=lot.stage,
                    parent_lot=lot.parent_lot, # sibling
                    variety=lot.variety,
                    quantity_kg=dispatch_qty,
                    season_year=lot.season_year,
                    status='dispatched',
                    farmer=farmer,
                    location_id=location_id,
                    custom_plot_id=custom_plot_id,
                    custom_coordinates=custom_coordinates,
                    notes=notes,
                    created_by=request.user,
                )
                
                SeedLotTransaction.objects.create(
                    seed_lot=lot,
                    txn_type='dispatch',
                    quantity_kg=dispatch_qty,
                    farmer=farmer,
                    notes=f"Partial dispatch to {new_lot_id}. {notes}",
                    recorded_by=request.user,
                )
                return Response(SeedLotSerializer(new_lot, context={'request': request}).data)
            else:
                # Full dispatch
                lot.farmer = farmer
                lot.status = 'dispatched'
                if location_id: lot.location_id = location_id
                if custom_plot_id: lot.custom_plot_id = custom_plot_id
                if custom_coordinates: lot.custom_coordinates = custom_coordinates
                lot.save(update_fields=['farmer', 'status', 'location_id', 'custom_plot_id', 'custom_coordinates'])

                SeedLotTransaction.objects.create(
                    seed_lot=lot,
                    txn_type='dispatch',
                    quantity_kg=dispatch_qty,
                    farmer=farmer,
                    notes=notes,
                    recorded_by=request.user,
                )
                return Response(SeedLotSerializer(lot, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='harvest')
    def log_harvest(self, request, pk=None):
        """POST /api/field/seed-lots/{id}/harvest/ — log harvest return from farmer, creates child lot."""
        parent_lot = self.get_object()
        quantity_kg = request.data.get('quantity_kg')
        new_lot_id = request.data.get('new_lot_id')
        notes = request.data.get('notes', '')
        location_id = request.data.get('location')
        custom_plot_id = request.data.get('custom_plot_id')
        custom_coordinates = request.data.get('custom_coordinates')

        if not quantity_kg or not new_lot_id or not location_id:
            return Response(
                {'error': 'quantity_kg, new_lot_id and location are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        NEXT_STAGE = {
            'breeder': 'foundation',
            'foundation': 'certified',
            'certified': 'commercial',
        }
        next_stage = NEXT_STAGE.get(parent_lot.stage)
        if not next_stage:
            return Response({'error': 'Commercial lots cannot be harvested further.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            parent_lot.status = 'harvested'
            parent_lot.save(update_fields=['status'])

            child_lot = SeedLot.objects.create(
                lot_id=new_lot_id,
                stage=next_stage,
                parent_lot=parent_lot,
                variety=parent_lot.variety,
                quantity_kg=quantity_kg,
                season_year=parent_lot.season_year + 1,
                status='in_field',
                farmer=parent_lot.farmer,
                location_id=location_id,
                custom_plot_id=custom_plot_id,
                custom_coordinates=custom_coordinates,
                notes=notes,
                created_by=request.user,
            )

            SeedLotTransaction.objects.create(
                seed_lot=parent_lot,
                txn_type='harvest',
                quantity_kg=quantity_kg,
                farmer=parent_lot.farmer,
                notes=f"Harvest returned. New lot: {new_lot_id}",
                recorded_by=request.user,
            )

        return Response(SeedLotSerializer(child_lot, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='genealogy')
    def genealogy(self, request):
        """GET /api/field/seed-lots/genealogy/?lot_ids=CM-001,CT-002 — returns ancestor tree for one or more lots."""
        lot_ids_param = request.query_params.get('lot_ids', '')
        if not lot_ids_param:
            return Response({'error': 'lot_ids query parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        input_ids = [lid.strip() for lid in lot_ids_param.split(',') if lid.strip()]
        collected = {}  # lot_id -> serialized lot
        edges = []

        def trace(lot):
            if lot.lot_id in collected:
                return
            collected[lot.lot_id] = SeedLotSerializer(lot, context={'request': request}).data
            if lot.parent_lot:
                edge_id = f"{lot.parent_lot.lot_id}-->{lot.lot_id}"
                if edge_id not in [e['id'] for e in edges]:
                    edges.append({'id': edge_id, 'source': lot.parent_lot.lot_id, 'target': lot.lot_id})
                trace(lot.parent_lot)
            elif lot.lab_batch_reference:
                # Inject a single synthetic LabNest origin node for all lab-originated lots
                lab_id = 'TISSUE_CULTURE_ROOT'
                if lab_id not in collected:
                    collected[lab_id] = {
                        'id': 'LabNest',
                        'lot_id': lab_id,
                        'stage': 'tissue_culture',
                        'quantity_kg': '0.000',
                        'season_year': lot.season_year,
                        'holder_name': 'LabNest Facility',
                        'status': 'transplanted',
                        'is_labnest': True,
                    }
                edge_id = f"{lab_id}-->{lot.lot_id}"
                if edge_id not in [e['id'] for e in edges]:
                    edges.append({'id': edge_id, 'source': lab_id, 'target': lot.lot_id})

        for lid in input_ids:
            try:
                lot = SeedLot.objects.select_related('parent_lot', 'variety', 'farmer', 'location').get(lot_id=lid)
                trace(lot)
            except SeedLot.DoesNotExist:
                pass  # skip unknown IDs

        return Response({'nodes': list(collected.values()), 'edges': edges})


class SeedLotTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ledger of all field events (dispatch, harvest, etc.)"""
    serializer_class = SeedLotTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SeedLotTransaction.objects.select_related(
            'seed_lot', 'farmer', 'location', 'recorded_by'
        ).all()
        lot_id = self.request.query_params.get('lot_id')
        farmer_id = self.request.query_params.get('farmer')
        if lot_id:
            qs = qs.filter(seed_lot__lot_id=lot_id)
        if farmer_id:
            qs = qs.filter(farmer_id=farmer_id)
        return qs


class FieldDashboardView(APIView):
    """GET /api/field/dashboard/ — aggregated KPIs for the FieldLink dashboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = request.query_params.get('year')
        qs = SeedLot.objects.all()
        if year:
            qs = qs.filter(season_year=year)

        stage_summary = {}
        for stage, label in SeedLot.STAGE_CHOICES:
            lots = qs.filter(stage=stage)
            stage_summary[stage] = {
                'label': label,
                'total_kg': float(lots.aggregate(t=Sum('quantity_kg'))['t'] or 0),
                'count': lots.count(),
            }

        farmers = Farmer.objects.filter(is_active=True)
        active_farmer_count = farmers.count()

        total_dispatched = float(
            SeedLotTransaction.objects.filter(txn_type='dispatch').aggregate(t=Sum('quantity_kg'))['t'] or 0
        )
        total_harvested = float(
            SeedLotTransaction.objects.filter(txn_type='harvest').aggregate(t=Sum('quantity_kg'))['t'] or 0
        )
        avg_ratio = round(total_harvested / total_dispatched, 2) if total_dispatched else 0

        # ── Per-location plot tracking summary ──────────────────────────────
        from core.models import FieldLocation, Plot
        TRACKED_LOCATIONS = ['Ajbapur', 'Hariawan', 'Loni', 'Rupapur']
        locations = FieldLocation.objects.filter(name__in=TRACKED_LOCATIONS)
        location_summary = []
        for loc in locations:
            plots = Plot.objects.filter(location=loc)
            total_plots = plots.count()
            plots_with_boundary = plots.exclude(boundaries__isnull=True).count()
            total_area = float(
                plots.aggregate(a=Sum('area_acres'))['a'] or 0
            )
            # Active lots: in_field status at this location
            active_lots = SeedLot.objects.filter(
                location=loc,
                status__in=['in_field', 'dispatched']
            )
            lots_by_stage = {}
            for stage, label in SeedLot.STAGE_CHOICES:
                count = active_lots.filter(stage=stage).count()
                if count:
                    lots_by_stage[stage] = count
            location_summary.append({
                'id': loc.id,
                'name': loc.name,
                'location_type': loc.location_type,
                'total_plots': total_plots,
                'plots_with_boundary': plots_with_boundary,
                'total_area_acres': round(total_area, 2),
                'active_lots_count': active_lots.count(),
                'lots_by_stage': lots_by_stage,
            })
        # Preserve display order
        order = {name: i for i, name in enumerate(TRACKED_LOCATIONS)}
        location_summary.sort(key=lambda x: order.get(x['name'], 99))

        return Response({
            'stage_summary': stage_summary,
            'active_farmers': active_farmer_count,
            'total_dispatched_kg': total_dispatched,
            'total_harvested_kg': total_harvested,
            'avg_yield_ratio': avg_ratio,
            'location_summary': location_summary,
        })

# Trigger auto-reloader
