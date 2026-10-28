"""Login lockout: after N failures an account (and the IP) is blocked for a while. Uses the Django cache (Redis in prod)."""
from django.conf import settings
from django.core.cache import cache


def _keys(email, ip):
    return [f'login-fail:acct:{email.lower()}', f'login-fail:ip:{ip}']


def is_locked(email, ip):
    return any(cache.get(k, 0) >= settings.LOGIN_MAX_ATTEMPTS * (1 if ':acct:' in k else 4) for k in _keys(email, ip))


def register_failure(email, ip):
    for k in _keys(email, ip):
        try:
            cache.incr(k)
        except ValueError:
            cache.set(k, 1, settings.LOGIN_LOCKOUT_MINUTES * 60)


def reset_failures(email, ip):
    cache.delete_many(_keys(email, ip))


def client_ip(request):
    return request.META.get('REMOTE_ADDR', '')
