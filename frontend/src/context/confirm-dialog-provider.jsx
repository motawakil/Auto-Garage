import { AlertTriangle } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'

const ConfirmContext = createContext(null)

/** Async confirm: `await confirm({title, ...})` resolves to false, true, or the typed reason when `reason` is set. */
export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null)
  const [reason, setReason] = useState('')
  const resolver = useRef(null)

  const confirm = useCallback((opts) => {
    setReason('')
    setState(opts)
    return new Promise((resolve) => (resolver.current = resolve))
  }, [])

  const close = (value) => {
    resolver.current?.(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in sm:items-center" onMouseDown={() => close(false)}>
          <div className="w-full max-w-md animate-pop rounded-2xl border border-border bg-card p-5 shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex gap-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${state.variant === 'destructive' ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-muted'}`}>
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{state.title}</h3>
                {state.description && <p className="mt-1 text-sm text-muted-foreground">{state.description}</p>}
                {state.reason && (
                  <Textarea autoFocus className="mt-3" placeholder={state.reasonPlaceholder || 'Motif (obligatoire)'} value={reason} onChange={(e) => setReason(e.target.value)} />
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => close(false)}>Annuler</Button>
              <Button
                variant={state.variant === 'destructive' ? 'primary' : 'dark'}
                disabled={state.reason && !reason.trim()}
                onClick={() => close(state.reason ? reason.trim() : true)}
              >
                {state.confirmLabel || 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
