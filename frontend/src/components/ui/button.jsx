import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm shadow-primary/20',
  secondary: 'bg-card text-foreground border border-border hover:bg-muted shadow-card',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  soft: 'bg-primary-soft text-primary-soft-foreground hover:brightness-95',
  dark: 'bg-foreground text-background hover:opacity-90',
  danger: 'bg-card text-red-600 border border-border hover:bg-red-50 dark:hover:bg-red-950/40',
}
const sizes = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
  icon: 'size-9 rounded-lg',
  'icon-sm': 'size-8 rounded-lg',
}

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading, icon: Icon, className, children, disabled, ...props }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all select-none',
        'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4 shrink-0" strokeWidth={2} /> : null}
      {children}
    </button>
  )
})
