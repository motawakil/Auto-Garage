from django.db.models import Q
from rest_framework import serializers

from .models import Client, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.display_name', read_only=True)
    fuel_label = serializers.CharField(source='get_fuel_display', read_only=True)
    repairs_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Vehicle
        fields = '__all__'

    def validate_plate(self, value):
        return value.strip().upper()

    def validate_vin(self, value):
        value = value.strip().upper()
        if value and len(value) != 17:
            raise serializers.ValidationError('Le VIN doit contenir 17 caractères.')
        return value


class ClientSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)
    vehicles_count = serializers.IntegerField(read_only=True, default=0)
    repairs_count = serializers.IntegerField(read_only=True, default=0)
    active_repairs_count = serializers.IntegerField(read_only=True, default=0)
    invoiced_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, default=0)
    plates = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = '__all__'

    def get_plates(self, obj):
        return [v.plate for v in obj.vehicles.all()][:3]

    def validate(self, attrs):
        # Duplicate guard: same phone, or same CIN, means the same person.
        phone = attrs.get('phone') or getattr(self.instance, 'phone', '')
        cin = attrs.get('cin') or getattr(self.instance, 'cin', '')
        dupes = Client.objects.filter(Q(phone=phone) | (Q(cin=cin) if cin else Q(pk__in=[])))
        if self.instance:
            dupes = dupes.exclude(pk=self.instance.pk)
        dupe = dupes.first()
        if dupe and not self.context.get('force'):
            raise serializers.ValidationError(
                {'phone': f'Un client existe déjà avec ces coordonnées : {dupe.display_name} ({dupe.code}).'})
        return attrs
