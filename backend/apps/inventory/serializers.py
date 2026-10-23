from rest_framework import serializers

from .models import Part, StockMovement, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    parts_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Supplier
        fields = '__all__'


class PartSerializer(serializers.ModelSerializer):
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


class StockMovementSerializer(serializers.ModelSerializer):
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
