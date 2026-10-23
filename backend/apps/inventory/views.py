from django.db.models import Count, F, Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Part, StockMovement, Supplier
from .serializers import PartCreateSerializer, PartSerializer, StockMovementSerializer, SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    ordering = ['name']
    serializer_class = SupplierSerializer
    search_fields = ['name', 'contact_name', 'phone', 'city']

    def get_queryset(self):
        return Supplier.objects.annotate(parts_count=Count('parts'))


class PartViewSet(viewsets.ModelViewSet):
    search_fields = ['reference', 'oem_reference', 'alt_references', 'designation', 'brand', 'compatible_models']
    filterset_fields = ['category', 'condition', 'supplier', 'brand']
    ordering_fields = ['designation', 'quantity', 'sale_price']

    def get_serializer_class(self):
        return PartCreateSerializer if self.action == 'create' else PartSerializer

    def get_queryset(self):
        qs = Part.objects.select_related('supplier')
        if self.request.query_params.get('low') == '1':
            qs = qs.filter(quantity__lte=F('min_quantity'))
        return qs

    @action(detail=False)
    def compatible(self, request):
        """Catalogue lookup by brand / model / year / engine. Unverified matches are flagged."""
        p = request.query_params
        qs = Part.objects.select_related('supplier')
        if p.get('brand'):
            qs = qs.filter(brand__iexact=p['brand'])
        if p.get('model'):
            qs = qs.filter(compatible_models__icontains=p['model'])
        if p.get('year'):
            y = int(p['year'])
            qs = qs.filter(Q(year_from__isnull=True) | Q(year_from__lte=y)).filter(Q(year_to__isnull=True) | Q(year_to__gte=y))
        if p.get('engine'):
            qs = qs.filter(Q(engines='') | Q(engines__icontains=p['engine']))
        if p.get('category'):
            qs = qs.filter(category=p['category'])
        return Response(PartSerializer(qs[:200], many=True).data)

    @action(detail=False)
    def brands(self, request):
        from apps.clients.models import Vehicle
        brands = set(Part.objects.exclude(brand='').values_list('brand', flat=True))
        brands |= set(Vehicle.objects.values_list('brand', flat=True))
        return Response(sorted(brands))


class StockMovementViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Movements are append-only: corrections are recorded as new movements."""
    serializer_class = StockMovementSerializer
    queryset = StockMovement.objects.select_related('part', 'repair_order')
    filterset_fields = ['part', 'kind', 'repair_order']
    search_fields = ['part__designation', 'part__reference', 'reason', 'repair_order__number']
