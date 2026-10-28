from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.billing.views import InvoiceViewSet, PaymentViewSet, QuoteViewSet
from apps.clients.views import ClientViewSet, VehicleViewSet
from apps.core import views as core
from apps.inventory.views import (
    OemEquivalenceViewSet, OemReferenceViewSet, PartViewSet, StockMovementViewSet, SupplierViewSet,
)
from apps.repairs.views import ExpertViewSet, InsuranceCompanyViewSet, RepairOrderViewSet, RepairTaskViewSet
from apps.staff.views import EmployeeViewSet

router = DefaultRouter()
router.register('clients', ClientViewSet, basename='client')
router.register('vehicles', VehicleViewSet, basename='vehicle')
router.register('repair-orders', RepairOrderViewSet, basename='repair-order')
router.register('tasks', RepairTaskViewSet, basename='task')
router.register('insurers', InsuranceCompanyViewSet, basename='insurer')
router.register('experts', ExpertViewSet, basename='expert')
router.register('quotes', QuoteViewSet, basename='quote')
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('payments', PaymentViewSet, basename='payment')
router.register('parts', PartViewSet, basename='part')
router.register('stock-movements', StockMovementViewSet, basename='stock-movement')
router.register('suppliers', SupplierViewSet, basename='supplier')
router.register('oem-references', OemReferenceViewSet, basename='oem-reference')
router.register('oem-equivalences', OemEquivalenceViewSet, basename='oem-equivalence')
router.register('employees', EmployeeViewSet, basename='employee')
router.register('documents', core.DocumentViewSet, basename='document')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include(router.urls)),
    path('api/settings/', core.GarageSettingsView.as_view()),
    path('api/dashboard/', core.DashboardView.as_view()),
    path('api/notifications/', core.NotificationsView.as_view()),
    path('api/search/', core.SearchView.as_view()),
    path('api/reports/', core.ReportsView.as_view()),
    path('api/exports/<str:name>.csv', core.ExportView.as_view()),
]
# Uploaded files are never served publicly: see DocumentViewSet.download / PaymentViewSet.receipt_file.
