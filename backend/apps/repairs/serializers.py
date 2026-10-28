from django.utils import timezone
from rest_framework import serializers

from apps.core.tenancy import CompanyModelSerializer
from .models import Expert, InsuranceCompany, RepairOrder, RepairTask


class InsuranceCompanySerializer(CompanyModelSerializer):
    repairs_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = InsuranceCompany
        fields = '__all__'


class ExpertSerializer(CompanyModelSerializer):
    full_name = serializers.CharField(read_only=True)
    company_names = serializers.SerializerMethodField()
    repairs_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Expert
        fields = '__all__'

    def get_company_names(self, obj):
        return [c.name for c in obj.companies.all()]

    def validate(self, attrs):
        last = attrs.get('last_name', getattr(self.instance, 'last_name', ''))
        first = attrs.get('first_name', getattr(self.instance, 'first_name', ''))
        phone = attrs.get('phone', getattr(self.instance, 'phone', ''))
        scoped = Expert.objects.filter(company=self._company())
        qs = scoped.filter(last_name__iexact=last, first_name__iexact=first)
        if phone:
            qs = qs | scoped.filter(phone=phone)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({'last_name': 'Cet expert existe déjà dans le répertoire.'})
        return attrs


class RepairTaskSerializer(CompanyModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True, default='')
    employee_color = serializers.CharField(source='employee.color', read_only=True, default='')
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    repair_order_number = serializers.CharField(source='repair_order.number', read_only=True)
    vehicle_label = serializers.CharField(source='repair_order.vehicle.__str__', read_only=True)
    is_late = serializers.SerializerMethodField()

    class Meta:
        model = RepairTask
        fields = '__all__'

    def get_is_late(self, obj):
        return bool(obj.due_date and obj.status != 'done' and obj.due_date < timezone.localdate())

    def validate(self, attrs):
        if attrs.get('status') == 'done' and not attrs.get('completed_at') and not getattr(self.instance, 'completed_at', None):
            attrs['completed_at'] = timezone.localdate()
        return attrs


class RepairOrderSerializer(CompanyModelSerializer):
    client_name = serializers.CharField(source='client.display_name', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    vehicle_label = serializers.CharField(source='vehicle.__str__', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    type_label = serializers.CharField(source='get_repair_type_display', read_only=True)
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True, default='')
    expert_name = serializers.CharField(source='expert.full_name', read_only=True, default='')
    employee_names = serializers.SerializerMethodField()
    tasks_total = serializers.IntegerField(read_only=True, default=0)
    tasks_done = serializers.IntegerField(read_only=True, default=0)
    is_late = serializers.SerializerMethodField()

    class Meta:
        model = RepairOrder
        fields = '__all__'

    def get_employee_names(self, obj):
        return [e.full_name for e in obj.employees.all()]

    def get_is_late(self, obj):
        return bool(obj.expected_delivery_date and obj.status not in ('done', 'delivered', 'closed', 'waiting_payment')
                    and obj.expected_delivery_date < timezone.localdate())

    def validate(self, attrs):
        vehicle = attrs.get('vehicle', getattr(self.instance, 'vehicle', None))
        client = attrs.get('client', getattr(self.instance, 'client', None))
        if vehicle and client and vehicle.client_id != client.pk:
            raise serializers.ValidationError({'vehicle': "Ce véhicule n'appartient pas au client sélectionné."})
        return attrs
