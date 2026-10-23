from django.db.models import Count, F, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import OemEquivalence, OemReference, Part, StockMovement, Supplier
from .oem_import import import_oem_workbook
from .serializers import (
    OemEquivalenceSerializer, OemReferenceSerializer, PartCreateSerializer, PartSerializer, StockMovementSerializer,
    SupplierSerializer,
)


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


class OemReferenceViewSet(viewsets.ModelViewSet):
    serializer_class = OemReferenceSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ['brand', 'model', 'year', 'engine', 'family', 'status', 'compatibility_confirmed']
    search_fields = ['designation', 'oem_reference', 'superseded_reference', 'family', 'equivalences__reference']
    ordering_fields = ['family', 'designation', 'status', 'updated_at']
    ordering = ['family', 'designation']

    def get_queryset(self):
        qs = OemReference.objects.select_related('part').prefetch_related('equivalences__supplier')
        p = self.request.query_params
        if p.get('model_contains'):
            qs = qs.filter(model__icontains=p['model_contains'])
        if p.get('engine_contains'):
            qs = qs.filter(Q(engine='') | Q(engine__icontains=p['engine_contains']))
        if p.get('for_year'):
            qs = qs.filter(Q(year__isnull=True) | Q(year=p['for_year']))
        return qs.distinct()

    @action(detail=False, methods=['post'], url_path='import')
    def import_file(self, request):
        file = request.FILES.get('file')
        if not file:
            raise ValidationError({'file': 'Sélectionnez un fichier Excel (.xlsx).'})
        try:
            stats = import_oem_workbook(file)
        except ValueError as exc:
            raise ValidationError({'file': str(exc)})
        except Exception:
            raise ValidationError({'file': 'Fichier illisible : utilisez le modèle Base_OEM (.xlsx).'})
        return Response(stats, status=status.HTTP_201_CREATED)

    @action(detail=False)
    def stats(self, request):
        qs = self.filter_queryset(self.get_queryset()).order_by()
        by_status = dict(qs.values_list('status').annotate(c=Count('id', distinct=True)))
        families = {}
        for fam, st, c in qs.values_list('family', 'status').annotate(c=Count('id', distinct=True)):
            row = families.setdefault(fam, {'family': fam, 'total': 0, 'unknown': 0, 'to_verify': 0, 'confirmed': 0})
            row['total'] += c
            row[st] += c
        vehicles = list(OemReference.objects.order_by().values('brand', 'model', 'year', 'engine').annotate(c=Count('id')))
        return Response({
            'total': sum(by_status.values()),
            'by_status': {k: by_status.get(k, 0) for k, _ in OemReference.STATUS_CHOICES},
            'families': sorted(families.values(), key=lambda r: r['family']),
            'vehicles': vehicles,
            'equivalences': OemEquivalence.objects.filter(oem__in=qs).count(),
        })


class OemEquivalenceViewSet(viewsets.ModelViewSet):
    serializer_class = OemEquivalenceSerializer
    queryset = OemEquivalence.objects.select_related('oem', 'supplier')
    filterset_fields = ['oem', 'kind', 'verified', 'supplier']
    search_fields = ['reference', 'manufacturer', 'oem__designation', 'oem__oem_reference']
