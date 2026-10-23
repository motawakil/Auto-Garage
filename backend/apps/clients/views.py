from django.db.models import Count, DecimalField, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.billing.services import client_finance
from apps.core.models import ActivityLog
from .models import Client, Vehicle
from .serializers import ClientSerializer, VehicleSerializer

ACTIVE_EXCLUDED = ['done', 'delivered', 'closed']


class ClientViewSet(viewsets.ModelViewSet):
    ordering = ['-created_at']
    serializer_class = ClientSerializer
    search_fields = ['first_name', 'last_name', 'company_name', 'phone', 'email', 'cin', 'vehicles__plate', 'repair_orders__number']
    filterset_fields = ['kind', 'city']
    ordering_fields = ['created_at', 'last_name', 'invoiced_total']

    def get_queryset(self):
        from apps.billing.models import Invoice
        invoiced = (Invoice.objects.filter(repair_order__client=OuterRef('pk'))
                    .exclude(status__in=['draft', 'cancelled']).values('repair_order__client')
                    .annotate(t=Sum('total_ttc_cache')).values('t'))
        return (Client.objects.prefetch_related('vehicles').annotate(
            vehicles_count=Count('vehicles', distinct=True),
            repairs_count=Count('repair_orders', distinct=True),
            active_repairs_count=Count('repair_orders', filter=~Q(repair_orders__status__in=ACTIVE_EXCLUDED), distinct=True),
            invoiced_total=Coalesce(Subquery(invoiced, output_field=DecimalField()), 0, output_field=DecimalField()),
        ).distinct())

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['force'] = self.request.query_params.get('force') == '1'
        return ctx

    def perform_create(self, serializer):
        obj = serializer.save()
        ActivityLog.record('client', obj, 'created', f'Fiche client créée : {obj.display_name}', client_id=obj.pk)

    def perform_update(self, serializer):
        obj = serializer.save()
        ActivityLog.record('client', obj, 'updated', 'Informations client modifiées', client_id=obj.pk)

    @action(detail=True)
    def overview(self, request, pk=None):
        client = self.get_object()
        history = ActivityLog.objects.filter(client_id=client.pk)[:50]
        return Response({
            'finance': client_finance(client),
            'history': [{'id': h.id, 'date': h.created_at, 'action': h.action, 'message': h.message,
                         'entity': h.entity, 'entity_id': h.entity_id} for h in history],
        })

    @action(detail=False)
    def duplicates(self, request):
        phone = request.query_params.get('phone', '').strip()
        name = request.query_params.get('name', '').strip()
        q = Q(pk__in=[])
        if phone:
            q |= Q(phone=phone) | Q(phone_secondary=phone)
        if len(name) >= 3:
            q |= Q(last_name__iexact=name) | Q(company_name__iexact=name)
        rows = Client.objects.filter(q)[:5]
        return Response([{'id': c.id, 'display_name': c.display_name, 'phone': c.phone, 'code': c.code} for c in rows])


class VehicleViewSet(viewsets.ModelViewSet):
    ordering = ['-created_at']
    serializer_class = VehicleSerializer
    search_fields = ['plate', 'vin', 'brand', 'model', 'client__last_name', 'client__first_name', 'client__company_name']
    filterset_fields = ['client', 'brand', 'fuel']
    ordering_fields = ['created_at', 'brand', 'year']

    def get_queryset(self):
        return Vehicle.objects.select_related('client').annotate(repairs_count=Count('repair_orders'))

    def perform_create(self, serializer):
        obj = serializer.save()
        ActivityLog.record('vehicle', obj, 'created', f'Véhicule ajouté : {obj}', client_id=obj.client_id)
