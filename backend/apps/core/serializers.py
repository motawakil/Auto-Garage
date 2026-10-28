from rest_framework import serializers

from apps.core.tenancy import CompanyModelSerializer
from .models import Document, GarageSettings


class GarageSettingsSerializer(CompanyModelSerializer):
    class Meta:
        model = GarageSettings
        exclude = ['id']


class DocumentSerializer(CompanyModelSerializer):
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    client_name = serializers.CharField(source='client.display_name', read_only=True, default='')
    repair_order_number = serializers.CharField(source='repair_order.number', read_only=True, default='')
    vehicle_label = serializers.CharField(source='vehicle.__str__', read_only=True, default='')
    size = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()

    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = '__all__'
        extra_kwargs = {'file': {'write_only': True}}

    def get_file_url(self, obj):
        return f'/api/documents/{obj.pk}/download/'

    def get_size(self, obj):
        try:
            return obj.file.size
        except (OSError, ValueError):
            return 0

    def get_is_image(self, obj):
        return obj.file.name.lower().rsplit('.', 1)[-1] in ('jpg', 'jpeg', 'png', 'webp', 'gif')
