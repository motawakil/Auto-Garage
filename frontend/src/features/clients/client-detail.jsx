import { useQuery } from '@tanstack/react-query'
import {
  Building2, Car, FileText, Gauge, History, LayoutGrid, Mail, MapPin, Pencil, Phone, Plus, Receipt, User, Wallet, Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { FormPanel } from '@/components/common/form-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { ResourceTable } from '@/components/common/resource-table'
import { StatusBadge } from '@/components/common/status-badge'
import { Timeline } from '@/components/common/timeline'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { useItem, useList } from '@/hooks/use-resource'
import { api, resources } from '@/lib/api'
import { REPAIR_STATUSES } from '@/lib/choices'
import { formatDate, formatNumber } from '@/lib/utils'
import { paymentColumns } from '@/features/payments/payment-columns'
import { invoiceColumns, quoteColumns } from '@/features/quotes/quote-columns'
import { repairColumns } from '@/features/repairs/repair-columns'
import { DocumentsGallery } from '@/features/reports/documents-gallery'
import { Plate } from '@/features/vehicles/vehicles'
import { vehicleFields } from '@/features/vehicles/vehicle-fields'
import { clientFields } from './client-fields'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function VehicleCard({ v, onEdit, onNewRepair }) {
  return (
    <Card className="group p-4 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white shadow-md">
          <Car className="size-5" />
        </div>
        <Plate value={v.plate} />
      </div>
      <p className="mt-3 font-semibold">{v.brand} {v.model}</p>
      <p className="text-xs text-muted-foreground">{[v.year, v.engine, v.fuel_label, v.color].filter(Boolean).join(' · ')}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Gauge className="size-3.5" />{v.mileage ? `${formatNumber(v.mileage)} km` : '—'}</span>
        <span className="flex items-center gap-1"><Wrench className="size-3.5" />{v.repairs_count} dossier(s)</span>
      </div>
      {v.vin && <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">VIN {v.vin}</p>}
      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" icon={Pencil} onClick={() => onEdit(v)}>Modifier</Button>
        <Button size="sm" variant="soft" className="flex-1" icon={Plus} onClick={() => onNewRepair(v)}>Dossier</Button>
      </div>
    </Card>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const setTab = (t) => setParams({ tab: t }, { replace: true })
  const [editing, setEditing] = useState(false)
  const [vehicle, setVehicle] = useState(null)

  const { data: c, isLoading } = useItem(resources.clients, id)
  const { data: vehicles } = useList(resources.vehicles, { client: id, page_size: 100 })
  const { data: active } = useList(resources.repairOrders, { client: id, group: 'active', page_size: 5 })
  const { data: overview } = useQuery({ queryKey: ['clients', 'overview', id], queryFn: () => api.get(`/clients/${id}/overview/`).then((r) => r.data) })
  const fin = overview?.finance

  if (isLoading || !c) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>

  const newRepair = (v) => navigate(`/dossiers?new=1&client=${c.id}${v ? `&vehicle=${v.id}` : ''}`)
  const vehicleRows = vehicles?.results ?? []

  const tabs = [
    { value: 'overview', label: "Vue d'ensemble", icon: LayoutGrid },
    { value: 'info', label: 'Informations', icon: User },
    { value: 'vehicles', label: 'Véhicules', icon: Car, count: c.vehicles_count },
    { value: 'repairs', label: 'Réparations', icon: Wrench, count: c.repairs_count },
    { value: 'billing', label: 'Devis & factures', icon: Receipt },
    { value: 'payments', label: 'Paiements', icon: Wallet },
    { value: 'documents', label: 'Documents', icon: FileText },
    { value: 'history', label: 'Historique', icon: History },
  ]

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <PageHeader
          breadcrumbs={[{ label: 'Clients', to: '/clients' }, { label: c.display_name }]}
          title={
            <span className="flex items-center gap-3">
              <Avatar name={c.display_name} size="lg" />
              <span>
                {c.display_name}
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                  <span className="font-mono">{c.code}</span>
                  <Badge tone={c.kind === 'company' ? 'blue' : 'neutral'}>{c.kind === 'company' ? 'Entreprise' : 'Particulier'}</Badge>
                  <span className="flex items-center gap-1"><Phone className="size-3.5" />{c.phone}</span>
                </span>
              </span>
            </span>
          }
          actions={
            <>
              <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>
              <Button icon={Car} onClick={() => setVehicle({})}>Nouveau véhicule</Button>
              <Button variant="primary" icon={Plus} onClick={() => newRepair()}>Nouveau dossier</Button>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['Véhicules', c.vehicles_count],
            ['Réparations', `${c.repairs_count}`, c.active_repairs_count ? `${c.active_repairs_count} en cours` : 'Aucune en cours'],
            ['Total facturé', <Money key="i" value={fin?.invoiced} />],
            ['Total payé', <Money key="p" value={fin?.paid} className="text-emerald-600" />],
            ['Reste dû', <Money key="b" value={fin?.balance} className={Number(fin?.balance) > 0 ? 'text-red-600' : ''} />],
          ].map(([label, value, hint]) => (
            <Card key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular">{value}</p>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </Card>
          ))}
        </div>

        <Tabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Card>
                <CardHeader title="Réparations en cours" action={<Button size="sm" variant="ghost" onClick={() => setTab('repairs')}>Tout voir</Button>} />
                <div className="divide-y divide-border border-t border-border">
                  {(active?.results ?? []).map((r) => (
                    <Link key={r.id} to={`/dossiers/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                      <span className="font-mono text-[13px] font-semibold">{r.number}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{r.vehicle_label}</span>
                      <StatusBadge list={REPAIR_STATUSES} value={r.status} />
                    </Link>
                  ))}
                  {active?.results?.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">Aucune réparation en cours.</p>}
                </div>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2">
                {vehicleRows.map((v) => <VehicleCard key={v.id} v={v} onEdit={setVehicle} onNewRepair={newRepair} />)}
              </div>
            </div>
            <Card>
              <CardHeader title="Coordonnées" action={<Button size="icon-sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)} />} />
              <CardBody className="divide-y divide-border pt-0">
                <InfoRow icon={Phone} label="Téléphone" value={[c.phone, c.phone_secondary].filter(Boolean).join(' / ')} />
                <InfoRow icon={Mail} label="E-mail" value={c.email} />
                <InfoRow icon={MapPin} label="Adresse" value={[c.address, c.city].filter(Boolean).join(', ')} />
                <InfoRow icon={Building2} label={c.kind === 'company' ? 'ICE' : 'CIN'} value={c.kind === 'company' ? c.ice : c.cin} />
                {c.notes && <InfoRow icon={FileText} label="Notes" value={c.notes} />}
                <p className="pt-3 text-xs text-muted-foreground">Client depuis le {formatDate(c.created_at)}</p>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'info' && (
          <Card>
            <CardHeader title="Informations personnelles" action={<Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>} />
            <CardBody className="grid gap-x-8 sm:grid-cols-2">
              <InfoRow icon={User} label="Nom complet" value={`${c.first_name} ${c.last_name}`} />
              {c.kind === 'company' && <InfoRow icon={Building2} label="Raison sociale" value={c.company_name} />}
              <InfoRow icon={Phone} label="Téléphone principal" value={c.phone} />
              <InfoRow icon={Phone} label="Téléphone secondaire" value={c.phone_secondary} />
              <InfoRow icon={Mail} label="E-mail" value={c.email} />
              <InfoRow icon={MapPin} label="Adresse" value={c.address} />
              <InfoRow icon={MapPin} label="Ville" value={c.city} />
              <InfoRow icon={FileText} label="CIN" value={c.cin} />
              <InfoRow icon={FileText} label="ICE" value={c.ice} />
              <InfoRow icon={FileText} label="Notes" value={c.notes} />
            </CardBody>
          </Card>
        )}

        {tab === 'vehicles' && (
          vehicleRows.length === 0 ? (
            <Card><EmptyState icon={Car} title="Aucun véhicule" action={<Button variant="primary" icon={Plus} onClick={() => setVehicle({})}>Nouveau véhicule</Button>} /></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {vehicleRows.map((v) => <VehicleCard key={v.id} v={v} onEdit={setVehicle} onNewRepair={newRepair} />)}
              <button onClick={() => setVehicle({})} className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary cursor-pointer">
                <Plus className="size-5" />Ajouter un véhicule
              </button>
            </div>
          )
        )}

        {tab === 'repairs' && (
          <ResourceTable resource={resources.repairOrders} params={{ client: id }} columns={repairColumns({ withClient: false })} rowLink={(r) => `/dossiers/${r.id}`}
            emptyIcon={Wrench} emptyTitle="Aucune réparation" />
        )}

        {tab === 'billing' && (
          <div className="space-y-6">
            <ResourceTable title="Devis" resource={resources.quotes} params={{ repair_order__client: id, latest: 1 }} columns={quoteColumns({ withClient: false })} rowLink={(q) => `/devis/${q.id}`} emptyTitle="Aucun devis" />
            <ResourceTable title="Factures" resource={resources.invoices} params={{ repair_order__client: id }} columns={invoiceColumns({ withClient: false })} rowLink={(i) => `/factures/${i.id}`} emptyTitle="Aucune facture" />
          </div>
        )}

        {tab === 'payments' && (
          <ResourceTable resource={resources.payments} params={{ client: id }} columns={paymentColumns({ withClient: false })} emptyIcon={Wallet} emptyTitle="Aucun paiement" />
        )}

        {tab === 'documents' && <DocumentsGallery params={{ client: id }} defaults={{ client: Number(id) }} />}

        {tab === 'history' && <Card className="p-6"><Timeline items={overview?.history} /></Card>}
      </div>

      <FormPanel open={editing} onClose={() => setEditing(false)} resource={resources.clients} item={c} fields={clientFields}
        title="Modifier le client" icon={User} onSaved={() => setEditing(false)} deletable={c.repairs_count === 0}
        onDeleted={() => navigate('/clients')} />
      <FormPanel open={!!vehicle} onClose={() => setVehicle(null)} resource={resources.vehicles} item={vehicle?.id ? vehicle : null}
        fields={vehicleFields(false)} fixed={{ client: c.id }} title={vehicle?.id ? `${vehicle.brand} ${vehicle.model}` : 'Nouveau véhicule'}
        icon={Car} related={['clients']} />
    </div>
  )
}
