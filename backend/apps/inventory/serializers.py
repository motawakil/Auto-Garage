from django.db.models import Q
from rest_framework import serializers

from apps.core.tenancy import CompanyModelSerializer
from .models import OemEquivalence, OemReference, Part, StockMovement, Supplier


class SupplierSerializer(CompanyModelSerializer):
    parts_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Supplier
        fields = '__all__'


class PartSerializer(CompanyModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default='')
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    condition_label = serializers.CharField(source='get_condition_display', read_only=True)
    is_low = serializers.BooleanField(read_only=True)
    stock_value = serializers.SerializerMethodField()

    class Meta:
        model = Part
        fields = '__all__'
        read_only_fields = ['quantity']

    def get_stock_value(self, obj):
        return obj.quantity * obj.purchase_price


class PartCreateSerializer(PartSerializer):
    """Initial quantity can be set on creation only; afterwards stock moves through movements."""

    class Meta(PartSerializer.Meta):
        read_only_fields = []


class StockMovementSerializer(CompanyModelSerializer):
    part_label = serializers.CharField(source='part.__str__', read_only=True)
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    repair_order_number = serializers.CharField(source='repair_order.number', read_only=True, default='')
    signed_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'

    def validate(self, attrs):
        kind, qty, part = attrs['kind'], attrs['quantity'], attrs['part']
        if kind != 'adjustment' and qty <= 0:
            raise serializers.ValidationError({'quantity': 'La quantité doit être positive.'})
        if kind == 'adjustment' and not attrs.get('reason'):
            raise serializers.ValidationError({'reason': 'Un ajustement doit être justifié.'})
        if kind == 'out' and not attrs.get('repair_order'):
            raise serializers.ValidationError({'repair_order': 'Une sortie doit être rattachée à un dossier.'})
        if StockMovement.SIGNS[kind] * qty < 0 and part.quantity + StockMovement.SIGNS[kind] * qty < 0:
            raise serializers.ValidationError({'quantity': f'Stock insuffisant ({part.quantity} disponible).'})
        if not attrs.get('unit_cost'):
            attrs['unit_cost'] = part.purchase_price
        return attrs


class OemEquivalenceSerializer(CompanyModelSerializer):
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default='')
    oem_label = serializers.CharField(source='oem.__str__', read_only=True)
    oem_reference = serializers.CharField(source='oem.oem_reference', read_only=True)

    class Meta:
        model = OemEquivalence
        fields = '__all__'

    def validate(self, attrs):
        g = lambda k: attrs.get(k, getattr(self.instance, k, None))
        attrs['reference'] = (g('reference') or '').strip().upper()
        if g('verified') and not (g('source_url') and g('verified_at')):
            raise serializers.ValidationError({'verified': 'Une équivalence vérifiée doit citer sa source et sa date de vérification.'})
        return attrs


class OemReferenceSerializer(CompanyModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    part_label = serializers.CharField(source='part.__str__', read_only=True, default='')
    equivalences = OemEquivalenceSerializer(many=True, read_only=True)
    stock_matches = serializers.SerializerMethodField()

    class Meta:
        model = OemReference
        fields = '__all__'

    def get_stock_matches(self, obj):
        """Stock parts matching this line: explicit link, OEM reference, supersession or a known equivalence."""
        refs = {r for r in [obj.oem_reference, *obj.superseded_reference.replace(';', ',').split(',')] if r.strip()}
        refs |= {e.reference for e in obj.equivalences.all()}
        q = Q(pk=obj.part_id) if obj.part_id else Q(pk__in=[])
        for r in {r.strip().upper() for r in refs}:
            q |= Q(oem_reference__iexact=r) | Q(reference__iexact=r) | Q(alt_references__icontains=r)
        return [{'id': p.id, 'reference': p.reference, 'designation': p.designation, 'quantity': p.quantity,
                 'sale_price': p.sale_price, 'condition': p.get_condition_display()}
                for p in Part.objects.filter(q, company_id=obj.company_id).distinct()[:5]]

    def validate(self, attrs):
        g = lambda k: attrs.get(k, getattr(self.instance, k, None))
        oem = (g('oem_reference') or '').strip().upper()
        attrs['oem_reference'] = oem
        status = g('status') or 'unknown'
        if not oem and status != 'unknown':
            raise serializers.ValidationError({'status': 'Sans référence OEM, le statut reste « Inconnue ». Ne jamais déduire une référence.'})
        if oem and status == 'unknown':
            attrs['status'] = status = 'to_verify'
        if status == 'confirmed' and not (g('source_url') and g('verified_at')):
            raise serializers.ValidationError({'status': 'Une référence confirmée doit citer sa source et sa date de vérification.'})
        if g('compatibility_confirmed') and status != 'confirmed':
            raise serializers.ValidationError({'compatibility_confirmed': 'La compatibilité ne peut être confirmée que pour une référence confirmée.'})
        return attrs
