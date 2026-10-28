from django.contrib import admin

from .models import Company, Membership


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    raw_id_fields = ['user']


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'city', 'is_active', 'created_at']
    search_fields = ['name', 'slug', 'ice']
    inlines = [MembershipInline]


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'role']
    list_filter = ['role', 'company']
    raw_id_fields = ['user']
