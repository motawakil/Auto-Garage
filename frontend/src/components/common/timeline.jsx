import { History } from 'lucide-react'

import { formatDate } from '@/lib/utils'
import { EmptyState } from './empty-state'

const ACTION_COLORS = { created: 'bg-emerald-500', status: 'bg-blue-500', cancelled: 'bg-red-500', revised: 'bg-violet-500' }

export function Timeline({ items = [] }) {
  if (!items.length) return <EmptyState icon={History} title="Aucun historique" />
  return (
    <ol className="relative ml-2 space-y-5 border-l border-border py-1 pl-6">
      {items.map((h) => (
        <li key={h.id} className="relative">
          <span className={`absolute -left-[29.5px] top-1 size-2.5 rounded-full ring-4 ring-card ${ACTION_COLORS[h.action] ?? 'bg-zinc-400'}`} />
          <p className="text-sm">{h.message}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(h.date, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </li>
      ))}
    </ol>
  )
}
