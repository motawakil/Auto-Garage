from django.contrib.auth import password_validation
from rest_framework import serializers

from .roles import PERMISSIONS, role_permissions


def user_payload(user):
    """Session payload returned by login and /auth/me (no token in the body: tokens live in httpOnly cookies)."""
    m = user.membership
    return {
        'user': {
            'id': user.id, 'email': user.email, 'first_name': user.first_name, 'last_name': user.last_name,
            'full_name': user.get_full_name() or user.email,
        },
        'company': {'id': m.company.id, 'name': m.company.name, 'slug': m.company.slug, 'city': m.company.city},
        'role': m.role,
        'role_label': m.get_role_display(),
        'permissions': role_permissions(m.role),
        'permission_catalog': PERMISSIONS,
    }


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Mot de passe actuel incorrect.')
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context['request'].user)
        return value
