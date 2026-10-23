import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { StatusBadge } from '@/components/common/status-badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useList, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { REPAIR_STAGES, REPAIR_STATUSES } from '@/lib/choices'
import { cn, formatDate } from '@/lib/utils'
import { Plate } from '@/features/vehicles/vehicles'
import { TaskProgress } from './repair-columns'

/** Workshop board: drag a card to another stage to move the dossier forward. */
export function RepairKanban({ params }) {
  const navigate = useNavigate()
  const [over, setOver] = useState(null)
  const { data, isLoading } = useList(resources.repairOrders, { page_size: 300, ...params })
  const save = useSave(resources.repairOrders, { success: 'Dossier déplacé' })
  const rows = data?.results ?? []
  const stages = REPAIR_STAGES.filter((s) => s.key !== 'closed')

  const drop = (e, stage) => {
    e.preventDefault()
    setOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    const row = rows.find((r) => r.id === id)
    if (row && !stage.statuses.includes(row.status)) save.mutate({ id, status: stage.statuses[0] })
  }

  return (
    <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="grid min-w-[1080px] grid-cols-4 gap-4">
        {stages.map((stage) => {
          const items = rows.filter((r) => stage.statuses.includes(r.status))
          return (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setOver(stage.key) }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(e, stage)}
              className={cn('flex min-h-[60vh] flex-col rounded-2xl border border-border bg-muted/40 p-2 transition-colors', over === stage.key && 'border-primary/50 bg-primary-soft/40')}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <p className="text-sm font-semibold">{stage.label}</p>
                <span className="rounded-full bg-card px-2 text-xs font-medium tabular shadow-card">{items.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                {items.map((r) => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(r.id))}
                    onClick={() => navigate(`/dossiers/${r.id}`)}
                    className="cursor-grab rounded-xl border border-border bg-card p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop active:cursor-grabbing"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">{r.number}</span>
                      <div className="flex items-center gap-1.5">
                        {r.is_insurance && <ShieldCheck className="size-3.5 text-violet-500" />}
                        {(r.priority === 'urgent' || r.priority === 'high') && <span className={cn('size-2 rounded-full', r.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-400')} />}
                      </div>
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{r.vehicle_label.split(' · ')[0]}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.client_name}</p>
                    <div className="mt-2"><Plate value={r.vehicle_plate} /></div>
                    <div className="mt-3"><StatusBadge list={REPAIR_STATUSES} value={r.status} /></div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                      <TaskProgress done={r.tasks_done} total={r.tasks_total} />
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[11px] tabular', r.is_late ? 'font-semibold text-red-600' : 'text-muted-foreground')}>
                          {formatDate(r.expected_delivery_date, { day: '2-digit', month: 'short' })}
                        </span>
                        <div className="flex -space-x-1.5">{r.employee_names.slice(0, 2).map((n) => <Avatar key={n} name={n} size="sm" className="ring-2 ring-card" />)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
