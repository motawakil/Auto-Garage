from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets

from apps.core.tenancy import CompanyScopedViewMixin
from .models import Employee
from .serializers import EmployeeSerializer


class EmployeeViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    ordering = ['first_name']
    serializer_class = EmployeeSerializer
    search_fields = ['first_name', 'last_name', 'phone']
    filterset_fields = ['role', 'is_active']

    def get_queryset(self):
        today = timezone.localdate()
        return Employee.objects.annotate(
            open_tasks=Count('tasks', filter=~Q(tasks__status='done')),
            late_tasks=Count('tasks', filter=~Q(tasks__status='done') & Q(tasks__due_date__lt=today)),
            done_tasks=Count('tasks', filter=Q(tasks__status='done')),
        )
