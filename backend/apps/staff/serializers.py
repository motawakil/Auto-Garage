from rest_framework import serializers

from apps.core.tenancy import CompanyModelSerializer
from .models import Employee


class EmployeeSerializer(CompanyModelSerializer):
    full_name = serializers.CharField(read_only=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    open_tasks = serializers.IntegerField(read_only=True, default=0)
    late_tasks = serializers.IntegerField(read_only=True, default=0)
    done_tasks = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Employee
        fields = '__all__'
