"""
Multi-company isolation. Unlike scoping each view by hand, every business ViewSet and serializer inherits these
mixins, so a record of company A can never be listed, read, modified or referenced by a user of company B.
"""
from rest_framework import serializers
from rest_framework.relations import ManyRelatedField, RelatedField

from apps.accounts.context import set_current_user
from apps.accounts.permissions import get_membership


def is_company_scoped(model):
    try:
        return model._meta.get_field('company').related_model.__name__ == 'Company'
    except Exception:
        return False


class CompanyScopedViewMixin:
    """Binds request.company and filters every queryset (lists, details, custom actions) on it."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        membership = get_membership(request.user)
        request.company = membership.company if membership else None
        set_current_user(request.user)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if is_company_scoped(queryset.model):
            queryset = queryset.filter(company=self.request.company)
        return queryset


class CompanyScopedSerializerMixin:
    """Restricts every related-field choice to the current company and stamps the company on creation."""

    def get_fields(self):
        fields = super().get_fields()
        company = self._company()
        for field in fields.values():
            relation = field.child_relation if isinstance(field, ManyRelatedField) else field
            if isinstance(relation, RelatedField) and not relation.read_only and relation.queryset is not None:
                if is_company_scoped(relation.queryset.model):
                    relation.queryset = relation.queryset.filter(company=company) if company else relation.queryset.none()
        return fields

    def _company(self):
        request = self.context.get('request')
        return getattr(request, 'company', None)

    def validate(self, attrs):
        """Per-company unique constraints (company is not a serializer field, so DRF cannot check them itself)."""
        attrs = super().validate(attrs)
        model, company = self.Meta.model, self._company()
        if company is None or not is_company_scoped(model):
            return attrs
        groups = [c.fields for c in model._meta.constraints if hasattr(c, 'fields') and 'company' in c.fields]
        groups += [g for g in model._meta.unique_together if 'company' in g]
        for group in groups:
            others = [f for f in group if f != 'company']
            values = {f: attrs.get(f, getattr(self.instance, f, None)) for f in others}
            if not any(f in attrs for f in others):
                continue
            qs = model.objects.filter(company=company, **values)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({others[-1]: 'Cette valeur existe déjà dans votre entreprise.'})
        return attrs

    def create(self, validated_data):
        if is_company_scoped(self.Meta.model):
            validated_data['company'] = self._company()
        return super().create(validated_data)


class CompanyModelSerializer(CompanyScopedSerializerMixin, serializers.ModelSerializer):
    pass


