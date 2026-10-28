from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.tenancy import CompanyScopedViewMixin
from apps.billing.services import repair_order_finance
from apps.core.models import ActivityLog
from apps.accounts.permissions import HasRolePermission
from .models import Expert, InsuranceCompany, RepairOrder, RepairTask
from .serializers import ExpertSerializer, InsuranceCompanySerializer, RepairOrderSerializer, RepairTaskSerializer


REFERENTIAL_RBAC = {'create': 'referentials.edit', 'update': 'referentials.edit',
                    'partial_update': 'referentials.edit', 'destroy': 'referentials.edit'}


class InsuranceCompanyViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    # Readable by everyone (needed in dossiers); managed from Paramètres by admins only.
    permission_classes = [HasRolePermission]
    rbac_open_actions = ('list', 'retrieve')
    rbac_action_permissions = REFERENTIAL_RBAC
    ordering = ['name']
    serializer_class = InsuranceCompanySerializer
    search_fields = ['name', 'phone', 'email']

    def get_queryset(self):
        return InsuranceCompany.objects.annotate(repairs_count=Count('repair_orders'))


class ExpertViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    permission_classes = [HasRolePermission]
    rbac_open_actions = ('list', 'retrieve')
    rbac_action_permissions = REFERENTIAL_RBAC
    ordering = ['last_name']
    serializer_class = ExpertSerializer
    search_fields = ['first_name', 'last_name', 'firm', 'phone']
    filterset_fields = ['companies']

    def get_queryset(self):
        return Expert.objects.prefetch_related('companies').annotate(repairs_count=Count('repair_orders'))


class RepairOrderViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    ordering = ['-entry_date', '-id']
    serializer_class = RepairOrderSerializer
    search_fields = ['number', 'client__last_name', 'client__first_name', 'client__company_name', 'client__phone',
                     'vehicle__plate', 'vehicle__brand', 'vehicle__model', 'claim_number']
    filterset_fields = ['status', 'client', 'vehicle', 'repair_type', 'is_insurance', 'insurance_company', 'expert', 'priority']
    ordering_fields = ['entry_date', 'expected_delivery_date', 'number', 'status']

    def get_queryset(self):
        qs = (RepairOrder.objects.select_related('client', 'vehicle', 'insurance_company', 'expert')
              .prefetch_related('employees')
              .annotate(tasks_total=Count('tasks', distinct=True),
                        tasks_done=Count('tasks', filter=Q(tasks__status='done'), distinct=True)))
        group = self.request.query_params.get('group')
        if group == 'active':
            qs = qs.exclude(status__in=['done', 'delivered', 'closed'])
        elif group == 'insurance':
            qs = qs.filter(is_insurance=True)
        return qs

    def _log(self, obj, action, message):
        ActivityLog.record('repair_order', obj, action, message, client_id=obj.client_id, repair_order_id=obj.pk)

    def perform_create(self, serializer):
        obj = serializer.save()
        self._log(obj, 'created', f'Dossier {obj.number} ouvert pour {obj.vehicle}')

    def perform_update(self, serializer):
        before = serializer.instance.status
        obj = serializer.save()
        if before != obj.status:
            self._log(obj, 'status', f'Dossier {obj.number} : statut « {obj.get_status_display()} »')
        else:
            self._log(obj, 'updated', f'Dossier {obj.number} modifié')

    @action(detail=True)
    def finance(self, request, pk=None):
        return Response(repair_order_finance(self.get_object()))

    @action(detail=True)
    def history(self, request, pk=None):
        rows = ActivityLog.objects.filter(company=request.company, repair_order_id=pk)[:100]
        return Response([{'id': h.id, 'date': h.created_at, 'action': h.action, 'message': h.message} for h in rows])

    @action(detail=False)
    def statuses(self, request):
        counts = dict(RepairOrder.objects.filter(company=request.company).order_by().values_list('status').annotate(c=Count('id')))
        return Response([{'value': v, 'label': l, 'count': counts.get(v, 0)} for v, l in RepairOrder.STATUS_CHOICES])


class RepairTaskViewSet(CompanyScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = RepairTaskSerializer
    filterset_fields = ['repair_order', 'employee', 'status', 'kind']
    search_fields = ['title', 'repair_order__number', 'employee__first_name', 'employee__last_name']
    ordering_fields = ['due_date', 'status', 'created_at']

    def get_queryset(self):
        qs = RepairTask.objects.select_related('employee', 'repair_order__vehicle')
        if self.request.query_params.get('open') == '1':
            qs = qs.exclude(status='done')
        return qs
