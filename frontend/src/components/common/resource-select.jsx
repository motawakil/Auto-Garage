import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useDebounce } from '@/hooks/use-debounce'
import { useItem, useList } from '@/hooks/use-resource'
import { cn } from '@/lib/utils'

/** Searchable select backed by a REST resource. Value is the id; supports `multiple`. */
export function ResourceSelect({ resource, value, onChange, getLabel, getSubLabel, params = {}, placeholder = 'Sélectionner…', multiple, invalid, disabled, clearable = true }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const search = useDebounce(q)
  const ref = useRef(null)
  const { data, isFetching } = useList(resource, { search, page_size: 30, ...params }, { enabled: open })
  const single = useItem(resource, !multiple ? value : null, { enabled: !multiple && !!value })
  const rows = data?.results ?? []
  const selected = multiple ? (value || []) : value

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (row) => {
    if (multiple) {
      const set = new Set(selected)
      set.has(row.id) ? set.delete(row.id) : set.add(row.id)
      onChange([...set])
    } else {
      onChange(row.id, row)
      setOpen(false)
    }
  }

  const display = multiple
    ? selected.length ? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}` : ''
    : value ? (single.data ? getLabel(single.data) : '…') : ''

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-invalid={invalid}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm transition-[border,box-shadow] cursor-pointer',
          'focus:border-primary/60 focus:ring-4 focus:ring-primary/10 outline-none disabled:opacity-60 aria-[invalid=true]:border-red-500',
          open && 'border-primary/60 ring-4 ring-primary/10',
        )}
      >
        <span className={cn('flex-1 truncate', !display && 'text-muted-foreground/70')}>{display || placeholder}</span>
        {clearable && (multiple ? selected.length > 0 : !!value) && !disabled ? (
          <X className="size-4 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange(multiple ? [] : null) }} />
        ) : (
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-64 animate-pop overflow-hidden rounded-xl border border-border bg-card shadow-pop">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="h-10 flex-1 bg-transparent text-sm outline-none" />
            {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="scrollbar-thin max-h-64 overflow-y-auto p-1">
            {rows.length === 0 && !isFetching && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>}
            {rows.map((row) => {
              const active = multiple ? selected.includes(row.id) : row.id === value
              return (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => pick(row)}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted cursor-pointer', active && 'bg-muted')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{getLabel(row)}</span>
                    {getSubLabel && <span className="block truncate text-xs text-muted-foreground">{getSubLabel(row)}</span>}
                  </span>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
