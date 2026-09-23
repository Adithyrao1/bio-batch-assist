from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Full access — admin role only."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsTechnician(BasePermission):
    """Write access — admin or technician."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('admin', 'technician')
        )


class IsViewer(BasePermission):
    """Read access — any authenticated user (all 3 roles)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated
