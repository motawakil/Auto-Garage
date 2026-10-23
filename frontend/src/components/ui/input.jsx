import { ChevronDown } from 'lucide-react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

const base =
  'w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 ' +
  'transition-[border,box-shadow] outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10 ' +
  'disabled:opacity-60 disabled:bg-muted aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10'

export const Input = forwardRef(function Input({ className, icon: Icon, suffix, ...props }, ref) {
  if (!Icon && !suffix) return <input ref={ref} className={cn(base, 'h-9', className)} {...props} />
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />}
      <input ref={ref} className={cn(base, 'h-9', Icon && 'pl-9', suffix && 'pr-12', className)} {...props} />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">{suffix}</span>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} rows={3} className={cn(base, 'py-2 resize-y min-h-20', className)} {...props} />
})

export const Select = forwardRef(function Select({ className, options = [], placeholder, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(base, 'h-9 appearance-none pr-9 cursor-pointer', className)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
})

export function Label({ className, children, required, ...props }) {
  return (
    <label className={cn('text-[13px] font-medium text-foreground/80', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-primary">*</span>}
    </label>
  )
}

export function Field({ label, error, hint, required, className, children, htmlFor }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <Label htmlFor={htmlFor} required={required}>{label}</Label>}
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function Switch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-input')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </button>
      {(label || description) && (
        <span className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
    </label>
  )
}
