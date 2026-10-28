from rest_framework.permissions import BasePermission

from .roles import ROLE_PERMISSIONS


def get_membership(user):
    if not user or not user.is_authenticated:
        return None
    m = getattr(user, 'membership', None)
    if m is None or not user.is_active or not m.company.is_active:
        return None
    return m


def has_permission(user, code):
    m = get_membership(user)
    return bool(m and code in ROLE_PERMISSIONS.get(m.role, set()))


class IsCompanyMember(BasePermission):
    """Default for the whole API: an authenticated, active login attached to an active company."""
    message = 'Accès réservé aux utilisateurs d’une entreprise active.'

    def has_permission(self, request, view):
        return get_membership(request.user) is not None


class HasRolePermission(BasePermission):
    """
    Karizma One style gate: `rbac_action_permissions = {action_or_method: code}` on the view.
    Actions absent from the mapping are open to company members only if the view lists them in
    `rbac_open_actions`; anything else is denied.
    """
    message = 'Vous n’avez pas les droits nécessaires pour cette action.'

    def has_permission(self, request, view):
        if get_membership(request.user) is None:
            return False
        action = getattr(view, 'action', None) or request.method.lower()
        if action in getattr(view, 'rbac_open_actions', ()):
            return True
        mapping = getattr(view, 'rbac_action_permissions', {})
        code = mapping.get(action) or mapping.get(request.method.lower())
        return bool(code) and has_permission(request.user, code)
