import { cn, formatMoney } from '@/lib/utils'

export function Money({ value, className, muted, currency = true }) {
  return (
    <span className={cn('tabular whitespace-nowrap', muted && Number(value || 0) === 0 && 'text-muted-foreground', className)}>
      {formatMoney(value, { currency })}
    </span>
  )
}
