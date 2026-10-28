from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import enforce_csrf
from .permissions import HasRolePermission, get_membership
from .security import client_ip, is_locked, register_failure, reset_failures
from .serializers import ChangePasswordSerializer, LoginSerializer, user_payload

INVALID = 'E-mail ou mot de passe incorrect.'


def set_auth_cookies(response, refresh):
    cfg, common = settings.AUTH_COOKIES, {'httponly': True, 'secure': settings.COOKIE_SECURE, 'samesite': settings.AUTH_COOKIE_SAMESITE}
    response.set_cookie(cfg['access']['name'], str(refresh.access_token), path=cfg['access']['path'],
                        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()), **common)
    response.set_cookie(cfg['refresh']['name'], str(refresh), path=cfg['refresh']['path'],
                        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()), **common)


def clear_auth_cookies(response):
    for c in settings.AUTH_COOKIES.values():
        response.delete_cookie(c['name'], path=c['path'], samesite=settings.AUTH_COOKIE_SAMESITE)


class PublicAuthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_authenticate_header(self, request):
        # Makes AuthenticationFailed answer 401 (not 403) so the frontend can tell "session expired" from "forbidden".
        return 'Cookie realm="api"'


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfView(PublicAuthView):
    """Bootstrap call: sets the csrftoken cookie the frontend echoes in X-CSRFToken."""

    def get(self, request):
        return Response({'ok': True})


class LoginView(PublicAuthView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        enforce_csrf(request)
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email, ip = ser.validated_data['email'].strip().lower(), client_ip(request)
        if is_locked(email, ip):
            raise PermissionDenied(f'Trop de tentatives. Réessayez dans {settings.LOGIN_LOCKOUT_MINUTES} minutes.')

        account = get_user_model().objects.filter(email__iexact=email).first()
        user = authenticate(request, username=account.username, password=ser.validated_data['password']) if account else None
        if user is None:
            register_failure(email, ip)
            raise AuthenticationFailed(INVALID)
        if get_membership(user) is None:
            # Only reachable with a correct password, so this message does not reveal whether an e-mail exists.
            register_failure(email, ip)
            raise AuthenticationFailed('Ce compte n’est rattaché à aucune entreprise active.')

        reset_failures(email, ip)
        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        refresh['company_id'] = user.membership.company_id
        response = Response(user_payload(user))
        set_auth_cookies(response, refresh)
        return response


class RefreshView(PublicAuthView):
    """Rotates the refresh token (old one blacklisted) and issues a new access token."""

    def post(self, request):
        enforce_csrf(request)
        raw = request.COOKIES.get(settings.AUTH_COOKIES['refresh']['name'])
        if not raw:
            raise AuthenticationFailed('Session expirée.')
        try:
            old = RefreshToken(raw)
            user = get_user_model().objects.get(pk=old['user_id'])
        except (TokenError, get_user_model().DoesNotExist):
            response = Response({'detail': 'Session expirée.'}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response)
            return response
        if get_membership(user) is None:
            old.blacklist()
            raise AuthenticationFailed('Accès désactivé.')
        old.blacklist()
        refresh = RefreshToken.for_user(user)
        refresh['company_id'] = user.membership.company_id
        response = Response({'ok': True})
        set_auth_cookies(response, refresh)
        return response


class LogoutView(PublicAuthView):
    def post(self, request):
        enforce_csrf(request)
        raw = request.COOKIES.get(settings.AUTH_COOKIES['refresh']['name'])
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    def get(self, request):
        return Response(user_payload(request.user))


class ChangePasswordView(APIView):
    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        # Other sessions keep their refresh token until expiry; this one gets fresh tokens.
        refresh = RefreshToken.for_user(request.user)
        refresh['company_id'] = request.user.membership.company_id
        response = Response({'detail': 'Mot de passe modifié.'})
        set_auth_cookies(response, refresh)
        return response


class CompanyUsersView(APIView):
    """Read-only list of the company's logins (accounts are created by the platform portal)."""
    permission_classes = [HasRolePermission]
    rbac_action_permissions = {'get': 'users.view'}

    def get(self, request):
        rows = request.user.membership.company.memberships.select_related('user').order_by('user__first_name')
        return Response([{
            'id': m.user.id, 'email': m.user.email, 'full_name': m.user.get_full_name() or m.user.email,
            'role': m.role, 'role_label': m.get_role_display(), 'is_active': m.user.is_active,
            'last_login': m.user.last_login,
        } for m in rows])
