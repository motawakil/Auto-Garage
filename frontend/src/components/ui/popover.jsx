import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/** Minimal popover: click trigger toggles, outside click / Escape closes. */
export function Popover({ trigger, children, align = 'end', className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-2 animate-pop rounded-xl border border-border bg-card shadow-pop',
            align === 'end' ? 'right-0' : 'left-0', className,
          )}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon: Icon, children, onClick, danger, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted cursor-pointer',
        danger && 'text-red-600', className,
      )}
    >
      {Icon && <Icon className="size-4 opacity-70" />}
      {children}
    </button>
  )
}
