import { Link } from 'react-router-dom'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const accents = {
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  neutral: 'bg-muted text-muted-foreground',
}

export function StatCard({ label, value, hint, icon: Icon, accent = 'neutral', to, loading, className }) {
  const body = (
    <div className={cn('group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card transition-all', to && 'hover:-translate-y-0.5 hover:shadow-pop', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex size-8 items-center justify-center rounded-lg', accents[accent])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{value}</p>}
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}
