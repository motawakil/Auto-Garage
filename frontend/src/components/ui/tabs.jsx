import { cn } from '@/lib/utils'

/** Underline tabs that scroll horizontally on small screens. */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('scrollbar-thin -mx-1 overflow-x-auto', className)}>
      <div className="flex min-w-max gap-1 border-b border-border px-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex items-center gap-2 px-3 pb-2.5 pt-1.5 text-sm font-medium transition-colors cursor-pointer',
              value === t.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.icon && <t.icon className="size-4" />}
            {t.label}
            {t.count != null && (
              <span className={cn('rounded-full px-1.5 text-[11px] tabular', value === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {t.count}
              </span>
            )}
            {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Pill-style segmented control for filters and view switches. */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cn('inline-flex rounded-lg bg-muted p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-all cursor-pointer',
            value === o.value ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.icon && <o.icon className="size-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  )
}
