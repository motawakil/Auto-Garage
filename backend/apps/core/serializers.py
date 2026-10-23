from rest_framework import serializers

from .models import Document, GarageSettings


class GarageSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GarageSettings
        exclude = ['id']


class DocumentSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    client_name = serializers.CharField(source='client.display_name', read_only=True, default='')
    repair_order_number = serializers.CharField(source='repair_order.number', read_only=True, default='')
    vehicle_label = serializers.CharField(source='vehicle.__str__', read_only=True, default='')
    size = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = '__all__'

    def get_size(self, obj):
        try:
            return obj.file.size
        except (OSError, ValueError):
            return 0

    def get_is_image(self, obj):
        return obj.file.name.lower().rsplit('.', 1)[-1] in ('jpg', 'jpeg', 'png', 'webp', 'gif')
