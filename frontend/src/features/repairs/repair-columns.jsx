import { AlertCircle, ShieldCheck } from 'lucide-react'

import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { REPAIR_STATUSES, REPAIR_TYPES, toneOf } from '@/lib/choices'
import { formatDate } from '@/lib/utils'
import { Plate } from '@/features/vehicles/vehicles'

export function TaskProgress({ done = 0, total = 0 }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular">{done}/{total}</span>
    </div>
  )
}

export const repairColumns = ({ withClient = true } = {}) => [
  {
    key: 'number', header: 'Dossier', sortKey: 'number', mobile: 'title',
    render: (r) => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="font-mono text-[13px] font-semibold">{r.number}</span>
        {r.is_insurance && <ShieldCheck className="size-4 text-violet-500" title="Sinistre assurance" />}
        {r.priority === 'urgent' && <Badge tone="red">Urgent</Badge>}
      </div>
    ),
  },
  {
    key: 'vehicle', header: 'Véhicule', mobile: 'subtitle',
    render: (r) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{r.vehicle_label.split(' · ')[0]}</p>
        <div className="mt-0.5"><Plate value={r.vehicle_plate} /></div>
      </div>
    ),
  },
  ...(withClient ? [{ key: 'client', header: 'Client', render: (r) => <div><p className="truncate">{r.client_name}</p><p className="text-xs text-muted-foreground tabular">{r.client_phone}</p></div> }] : []),
  { key: 'type', header: 'Type', responsive: 'hidden xl:table-cell', render: (r) => <Badge tone={toneOf(REPAIR_TYPES, r.repair_type)}>{r.type_label}</Badge> },
  { key: 'status', header: 'Statut', sortKey: 'status', render: (r) => <StatusBadge list={REPAIR_STATUSES} value={r.status} /> },
  { key: 'tasks', header: 'Tâches', responsive: 'hidden 2xl:table-cell', render: (r) => <TaskProgress done={r.tasks_done} total={r.tasks_total} /> },
  {
    key: 'dates', header: 'Livraison prévue', sortKey: 'expected_delivery_date',
    render: (r) => (
      <span className={r.is_late ? 'inline-flex items-center gap-1 font-medium text-red-600' : 'text-muted-foreground'}>
        {r.is_late && <AlertCircle className="size-3.5" />}
        {formatDate(r.expected_delivery_date, { day: '2-digit', month: 'short' })}
      </span>
    ),
  },
]

