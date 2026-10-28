from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


def enforce_csrf(request):
    check = CsrfViewMiddleware(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise PermissionDenied('Vérification CSRF échouée. Rechargez la page.')


class CookieJWTAuthentication(JWTAuthentication):
    """Access token read from an httpOnly cookie; CSRF enforced because the browser sends cookies automatically."""

    def authenticate(self, request):
        raw = request.COOKIES.get(settings.AUTH_COOKIES['access']['name'])
        if raw is None:
            return None
        validated = self.get_validated_token(raw)
        user = self.get_user(validated)
        enforce_csrf(request)
        return user, validated
