import { AlertCircle, Check, ClipboardList, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { FormPanel } from '@/components/common/form-panel'
import { StatusBadge } from '@/components/common/status-badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useList, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { TASK_KINDS, TASK_STATUSES } from '@/lib/choices'
import { cn, formatDate, today } from '@/lib/utils'

export const taskFields = (withRepair) => [
  ...(withRepair ? [{ name: 'repair_order', label: 'Dossier', type: 'resource', resource: resources.repairOrders, required: true,
    params: { group: 'active' }, getLabel: (r) => r.number, getSubLabel: (r) => r.vehicle_label }] : []),
  { name: 'kind', label: 'Type de tâche', type: 'select', options: TASK_KINDS, required: true },
  { name: 'title', label: 'Intitulé', required: true },
  { name: 'employee', label: 'Responsable', type: 'resource', resource: resources.employees, params: { is_active: true },
    getLabel: (e) => e.full_name, getSubLabel: (e) => e.role_label },
  { name: 'status', label: 'Statut', type: 'select', options: TASK_STATUSES, span: 1, required: true },
  { name: 'hours_spent', label: 'Temps passé', type: 'number', step: '0.25', suffix: 'h', span: 1 },
  { name: 'start_date', label: 'Début', type: 'date', span: 1 },
  { name: 'due_date', label: 'Échéance', type: 'date', span: 1 },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

/** Tasks of a dossier (or of the whole workshop when `repairOrder` is omitted). */
export function TaskList({ repairOrder, params = {}, showRepair = false, title }) {
  const [editing, setEditing] = useState(null)
  const query = { page_size: 200, ordering: 'due_date', ...(repairOrder ? { repair_order: repairOrder } : {}), ...params }
  const { data, isLoading } = useList(resources.tasks, query)
  const save = useSave(resources.tasks, { related: ['repair-orders', 'employees'], success: false })
  const rows = data?.results ?? []
  const done = rows.filter((t) => t.status === 'done').length

  const toggle = (t) => save.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done', ...(t.status !== 'done' ? { completed_at: today() } : { completed_at: null }) })

  return (
    <div className="flex items-start gap-6">
      <Card className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <h3 className="text-[15px] font-semibold">{title ?? 'Tâches'}</h3>
            <p className="text-xs text-muted-foreground">{done}/{rows.length} terminée(s)</p>
          </div>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setEditing({})}>Ajouter une tâche</Button>
        </div>
        {rows.length > 0 && (
          <div className="h-1 bg-muted"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / rows.length) * 100}%` }} /></div>
        )}
        {isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucune tâche" description="Démontage, redressage, peinture, contrôle final…" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((t) => (
              <li key={t.id} className={cn('flex items-center gap-3 px-5 py-3 hover:bg-muted/40', editing?.id === t.id && 'bg-primary-soft/50')}>
                <button
                  onClick={() => toggle(t)}
                  className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors cursor-pointer',
                    t.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-input hover:border-emerald-500')}
                  aria-label="Terminer la tâche"
                >
                  {t.status === 'done' && <Check className="size-3.5" strokeWidth={3} />}
                </button>
                <button className="min-w-0 flex-1 text-left cursor-pointer" onClick={() => setEditing(t)}>
                  <p className={cn('truncate text-sm font-medium', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {showRepair && <Link to={`/dossiers/${t.repair_order}`} onClick={(e) => e.stopPropagation()} className="font-mono hover:text-primary">{t.repair_order_number} · </Link>}
                    {t.kind_label}{Number(t.hours_spent) > 0 && ` · ${t.hours_spent} h`}
                  </p>
                </button>
                <span className={cn('hidden items-center gap-1 text-xs sm:flex', t.is_late ? 'font-semibold text-red-600' : 'text-muted-foreground')}>
                  {t.is_late && <AlertCircle className="size-3.5" />}{formatDate(t.due_date, { day: '2-digit', month: 'short' })}
                </span>
                <span className="hidden md:block"><StatusBadge list={TASK_STATUSES} value={t.status} /></span>
                {t.employee_name ? <Avatar name={t.employee_name} color={t.employee_color} size="sm" /> : <span className="size-6 rounded-full border border-dashed border-input" title="Non assignée" />}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <FormPanel open={!!editing} onClose={() => setEditing(null)} resource={resources.tasks} item={editing?.id ? editing : null}
        fields={taskFields(!repairOrder)} fixed={repairOrder ? { repair_order: repairOrder } : undefined}
        defaults={{ status: 'todo', kind: 'other', start_date: today() }} title={editing?.id ? editing.title : 'Nouvelle tâche'}
        icon={ClipboardList} related={['repair-orders', 'employees']} />
    </div>
  )
}
