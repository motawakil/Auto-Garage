import { useQuery } from '@tanstack/react-query'
import {
  Boxes, Calendar, Car, ClipboardList, FileCheck2, FileText, Gauge, History, LayoutGrid, Pencil, Phone, Plus,
  Printer, Receipt, ShieldCheck, User, Wallet, Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { FormPanel } from '@/components/common/form-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { ResourceTable } from '@/components/common/resource-table'
import { Timeline } from '@/components/common/timeline'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { useItem, useSave } from '@/hooks/use-resource'
import { api, resources } from '@/lib/api'
import { MOVEMENT_KINDS, PRIORITIES, REPAIR_STAGES, REPAIR_STATUSES, REPAIR_TYPES, toneOf } from '@/lib/choices'
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils'
import { StatusBadge } from '@/components/common/status-badge'
import { paymentDefaults, paymentFields } from '@/features/payments/payment-fields'
import { paymentColumns } from '@/features/payments/payment-columns'
import { invoiceColumns, quoteColumns } from '@/features/quotes/quote-columns'
import { DocumentsGallery } from '@/features/reports/documents-gallery'
import { movementDefaults, movementFields } from '@/features/stock/movement-fields'
import { Plate } from '@/features/vehicles/vehicles'
import { InsuranceWizard } from './insurance-wizard'
import { repairFields } from './repair-fields'
import { TaskList } from './task-list'

function StageStepper({ status }) {
  const current = REPAIR_STAGES.findIndex((s) => s.statuses.includes(status))
  return (
    <div className="flex items-center gap-1.5">
      {REPAIR_STAGES.map((s, i) => (
        <div key={s.key} className="min-w-0 flex-1">
          <div className={cn('h-1.5 rounded-full transition-colors', i < current ? 'bg-emerald-500' : i === current ? 'bg-primary' : 'bg-muted')} />
          <p className={cn('mt-1.5 truncate text-[11px] font-medium', i === current ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function FinanceRow({ label, value, strong, tone }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Money value={value} className={cn(strong && 'font-semibold', tone)} />
    </div>
  )
}

export default function RepairDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const setTab = (t) => setParams({ tab: t }, { replace: true })
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [moving, setMoving] = useState(false)

  const { data: ro, isLoading } = useItem(resources.repairOrders, id)
  const { data: fin } = useQuery({ queryKey: ['repair-orders', 'finance', id], queryFn: () => api.get(`/repair-orders/${id}/finance/`).then((r) => r.data) })
  const { data: history } = useQuery({ queryKey: ['repair-orders', 'history', id], queryFn: () => api.get(`/repair-orders/${id}/history/`).then((r) => r.data), enabled: tab === 'history' })
  const save = useSave(resources.repairOrders, { success: 'Statut mis à jour' })
  const createQuote = useSave(resources.quotes, { success: 'Devis créé', onSuccess: (q) => navigate(`/devis/${q.id}`) })

  if (isLoading || !ro) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>

  const tabs = [
    { value: 'overview', label: 'Aperçu', icon: LayoutGrid },
    { value: 'tasks', label: 'Tâches', icon: ClipboardList, count: ro.tasks_total },
    ...(ro.is_insurance ? [{ value: 'insurance', label: 'Assurance', icon: ShieldCheck }] : []),
    { value: 'quotes', label: 'Devis', icon: FileCheck2 },
    { value: 'invoices', label: 'Factures', icon: Receipt },
    { value: 'payments', label: 'Paiements', icon: Wallet },
    { value: 'parts', label: 'Pièces', icon: Boxes },
    { value: 'documents', label: 'Documents', icon: FileText },
    { value: 'history', label: 'Historique', icon: History },
  ]

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <PageHeader
          breadcrumbs={[{ label: 'Dossiers', to: '/dossiers' }, { label: ro.number }]}
          title={<span className="font-mono">{ro.number}</span>}
          actions={
            <>
              <div className="w-60"><Select value={ro.status} options={REPAIR_STATUSES} onChange={(e) => save.mutate({ id: ro.id, status: e.target.value })} /></div>
              <Button icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>
              <Button variant="primary" icon={Plus} loading={createQuote.isPending}
                onClick={() => createQuote.mutate({ repair_order: ro.id, kind: ro.is_insurance ? 'insurance' : 'estimate' })}>Nouveau devis</Button>
            </>
          }
        >
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge list={REPAIR_STATUSES} value={ro.status} />
            <Badge tone={toneOf(REPAIR_TYPES, ro.repair_type)}>{ro.type_label}</Badge>
            <Badge tone={toneOf(PRIORITIES, ro.priority)}>Priorité {ro.priority_label.toLowerCase()}</Badge>
            {ro.is_insurance && <Badge tone="violet"><ShieldCheck className="size-3" />{ro.insurance_company_name || 'Assurance'}{ro.claim_number && ` · ${ro.claim_number}`}</Badge>}
            {ro.is_late && <Badge tone="red">Livraison en retard</Badge>}
          </div>
        </PageHeader>

        <Card className="p-5"><StageStepper status={ro.status} /></Card>

        <Tabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader title="Description des dommages / panne" action={<Button size="icon-sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)} />} />
              <CardBody><p className="whitespace-pre-line text-sm leading-relaxed">{ro.description || <span className="text-muted-foreground">Aucune description.</span>}</p></CardBody>
            </Card>
            <Card>
              <CardHeader title="Planning" icon={Calendar} />
              <CardBody className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Entrée</p><p className="font-medium">{formatDate(ro.entry_date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Livraison prévue</p><p className={cn('font-medium', ro.is_late && 'text-red-600')}>{formatDate(ro.expected_delivery_date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Livré le</p><p className="font-medium">{formatDate(ro.delivered_at)}</p></div>
                <div><p className="text-xs text-muted-foreground">Kilométrage entrée</p><p className="font-medium tabular">{ro.mileage_in ? `${formatNumber(ro.mileage_in)} km` : '—'}</p></div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Équipe" icon={User} />
              <CardBody className="space-y-2">
                {ro.employee_names.length === 0 && <p className="text-sm text-muted-foreground">Aucun employé affecté.</p>}
                {ro.employee_names.map((n) => <div key={n} className="flex items-center gap-2.5 text-sm"><Avatar name={n} size="sm" />{n}</div>)}
              </CardBody>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:col-span-2 2xl:hidden">
              <RepairSidebar ro={ro} fin={fin} onPay={() => setPaying(true)} />
            </div>
            {ro.notes && (
              <Card className="lg:col-span-2 border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5">
                <CardBody className="pt-5 text-sm"><span className="font-medium">Note interne : </span>{ro.notes}</CardBody>
              </Card>
            )}
          </div>
        )}

        {tab === 'tasks' && <TaskList repairOrder={ro.id} />}
        {tab === 'insurance' && <InsuranceWizard ro={ro} />}
        {tab === 'quotes' && (
          <ResourceTable resource={resources.quotes} params={{ repair_order: ro.id }} columns={quoteColumns({ withClient: false })}
            rowLink={(q) => `/devis/${q.id}`} emptyIcon={FileCheck2} emptyTitle="Aucun devis" title="Devis et versions"
            action={<Button size="sm" variant="primary" icon={Plus} onClick={() => createQuote.mutate({ repair_order: ro.id, kind: ro.is_insurance ? 'insurance' : 'estimate' })}>Nouveau devis</Button>} />
        )}
        {tab === 'invoices' && (
          <ResourceTable resource={resources.invoices} params={{ repair_order: ro.id }} columns={invoiceColumns({ withClient: false })}
            rowLink={(i) => `/factures/${i.id}`} emptyIcon={Receipt} emptyTitle="Aucune facture" title="Factures"
            action={<span className="text-xs text-muted-foreground">Créez une facture depuis un devis accepté</span>} />
        )}
        {tab === 'payments' && (
          <ResourceTable resource={resources.payments} params={{ repair_order: ro.id }} columns={paymentColumns({ withClient: false })}
            emptyIcon={Wallet} emptyTitle="Aucun paiement" title="Encaissements"
            action={<Button size="sm" variant="primary" icon={Plus} onClick={() => setPaying(true)}>Encaisser</Button>} />
        )}
        {tab === 'parts' && (
          <ResourceTable resource={resources.movements} params={{ repair_order: ro.id }} title="Pièces consommées" emptyIcon={Boxes} emptyTitle="Aucune pièce sortie du stock"
            action={<Button size="sm" variant="primary" icon={Plus} onClick={() => setMoving(true)}>Sortie de stock</Button>}
            columns={[
              { key: 'date', header: 'Date', render: (m) => formatDate(m.date) },
              { key: 'part', header: 'Pièce', mobile: 'title', render: (m) => m.part_label },
              { key: 'kind', header: 'Mouvement', render: (m) => <StatusBadge list={MOVEMENT_KINDS} value={m.kind} dot={false} /> },
              { key: 'qty', header: 'Qté', align: 'right', render: (m) => <span className="tabular">{m.signed_quantity}</span> },
              { key: 'cost', header: 'Coût', align: 'right', render: (m) => <Money value={Math.abs(m.signed_quantity) * m.unit_cost} /> },
            ]} />
        )}
        {tab === 'documents' && <DocumentsGallery params={{ repair_order: ro.id }} defaults={{ repair_order: ro.id, client: ro.client, vehicle: ro.vehicle }} />}
        {tab === 'history' && <Card className="p-6"><Timeline items={history} /></Card>}
      </div>

      <aside className="hidden w-[320px] shrink-0 space-y-4 2xl:block">
        <RepairSidebar ro={ro} fin={fin} onPay={() => setPaying(true)} />
      </aside>

      <FormPanel open={editing} onClose={() => setEditing(false)} resource={resources.repairOrders} item={ro} fields={repairFields}
        title={`Modifier ${ro.number}`} icon={Wrench} deletable={false} />
      <FormPanel open={paying} onClose={() => setPaying(false)} resource={resources.payments} fields={paymentFields}
        defaults={{ ...paymentDefaults(), client: ro.client, repair_order: ro.id, origin: 'client' }} title="Enregistrer un paiement" icon={Wallet}
        related={['repair-orders', 'invoices']} success="Paiement enregistré" />
      <FormPanel open={moving} onClose={() => setMoving(false)} resource={resources.movements} fields={movementFields({ withRepair: false })}
        defaults={{ ...movementDefaults(), kind: 'out' }} fixed={{ repair_order: ro.id }} title="Sortie de pièce pour ce dossier" icon={Boxes}
        related={['parts', 'repair-orders']} success="Mouvement enregistré" />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1 text-xs">
            <p className="text-muted-foreground">Reste à payer</p>
            <p className="text-base font-semibold tabular">{formatMoney(fin?.balance)}</p>
          </div>
          <Button icon={Wallet} variant="primary" onClick={() => setPaying(true)}>Encaisser</Button>
        </div>
      </div>
      <div className="h-16 lg:hidden" />
    </div>
  )
}

function RepairSidebar({ ro, fin, onPay }) {
  return (
    <>
      <Card>
        <CardHeader title="Situation financière" icon={Wallet} />
        <CardBody className="pt-0">
          {!fin ? <Skeleton className="h-40" /> : (
            <>
              <div className="divide-y divide-border">
                <div className="pb-2">
                  <FinanceRow label="Approuvé TTC" value={fin.approved_ttc} />
                  <FinanceRow label="Facturé TTC" value={fin.invoiced_ttc} strong />
                  <FinanceRow label="Encaissé" value={fin.received} tone="text-emerald-600" />
                  <FinanceRow label="dont acomptes" value={fin.deposits} />
                  {Number(fin.pending_cheques) > 0 && <FinanceRow label="Chèques non encaissés" value={fin.pending_cheques} tone="text-amber-600" />}
                </div>
                {ro.is_insurance && (
                  <div className="py-2">
                    <p className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-violet-600">Assurance</p>
                    <FinanceRow label="Part assurance" value={fin.insurance_share} />
                    <FinanceRow label="Payé par l’assurance" value={fin.insurance_paid} />
                    <FinanceRow label="Reste à recevoir" value={fin.insurance_balance} strong />
                  </div>
                )}
                <div className="py-2">
                  <p className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
                  <FinanceRow label="Part client" value={fin.client_share} />
                  <FinanceRow label="Payé par le client" value={fin.client_paid} />
                  <FinanceRow label="Reste dû client" value={fin.client_balance} strong />
                </div>
                <div className="pt-2">
                  <FinanceRow label="Coût pièces" value={fin.parts_cost} />
                  <FinanceRow label="Main-d'œuvre" value={fin.labor_cost} />
                  <FinanceRow label="Marge estimée HT" value={fin.margin} strong tone={Number(fin.margin) < 0 ? 'text-red-600' : 'text-emerald-600'} />
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-sidebar p-4 text-white">
                <p className="text-xs text-white/60">Solde restant à payer</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular">{formatMoney(fin.balance)}</p>
                <Button variant="primary" className="mt-3 w-full" icon={Wallet} onClick={onPay}>Encaisser</Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
      <Card className="p-4">
        <Link to={`/clients/${ro.client}`} className="flex items-center gap-3 hover:opacity-80">
          <Avatar name={ro.client_name} />
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{ro.client_name}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{ro.client_phone}</p></div>
        </Link>
        <div className="my-3 h-px bg-border" />
        <div className="flex items-start gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted"><Car className="size-4 text-muted-foreground" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ro.vehicle_label.split(' · ')[0]}</p>
            <div className="mt-1"><Plate value={ro.vehicle_plate} /></div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><Gauge className="size-3" />{ro.mileage_in ? `${formatNumber(ro.mileage_in)} km` : '—'}</p>
          </div>
        </div>
      </Card>
      <Button className="w-full" icon={Printer} onClick={() => window.print()}>Imprimer la fiche</Button>
    </>
  )
}
