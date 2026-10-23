import { X } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Docked side panel. On desktop it sits beside the content (never over the table or the menu);
 * on small screens it becomes a full-height sheet.
 */
export function Panel({ open, onClose, title, subtitle, icon: Icon, children, footer, width = 'w-[440px]' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] animate-in xl:hidden" onClick={onClose} />
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col bg-card animate-slide sm:w-[440px] sm:border-l sm:border-border',
          'xl:sticky xl:top-[4.5rem] xl:z-0 xl:h-[calc(100dvh-5.5rem)] xl:shrink-0 xl:rounded-2xl xl:border xl:shadow-card',
          width,
        )}
      >
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          {Icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Icon className="size-[18px]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" icon={X} onClick={onClose} aria-label="Fermer" />
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</footer>}
      </aside>
    </>
  )
}
