import { useQuery } from '@tanstack/react-query'
import { Boxes, Car, CornerDownLeft, FileCheck2, Loader2, Receipt, Search, Users, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDebounce } from '@/hooks/use-debounce'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { NAV, QUICK_ACTIONS } from './nav'

const TYPE_ICONS = { client: Users, vehicle: Car, repair: Wrench, invoice: Receipt, quote: FileCheck2, part: Boxes }
const TYPE_LABELS = { client: 'Client', vehicle: 'Véhicule', repair: 'Dossier', invoice: 'Facture', quote: 'Devis', part: 'Pièce' }

/** ⌘K palette: global search across clients, plates, dossiers, documents and pages. */
export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)
  const search = useDebounce(q, 180)
  const { data = [], isFetching } = useQuery({
    queryKey: ['search', search],
    queryFn: () => api.get('/search/', { params: { q: search } }).then((r) => r.data),
    enabled: open && search.length >= 2,
  })

  const items = useMemo(() => {
    const lower = q.toLowerCase()
    const pages = NAV.flatMap((s) => s.items).filter((i) => !q || i.label.toLowerCase().includes(lower)).map((i) => ({ group: 'Navigation', title: i.label, icon: i.icon, link: i.to }))
    const actions = QUICK_ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(lower)).map((a) => ({ group: 'Actions rapides', title: a.label, icon: a.icon, link: a.to }))
    const results = search.length >= 2 ? data.map((r) => ({ group: 'Résultats', title: r.title, subtitle: r.subtitle, icon: TYPE_ICONS[r.type], tag: TYPE_LABELS[r.type], link: r.link })) : []
    return [...results, ...actions.slice(0, q ? 5 : 3), ...pages.slice(0, q ? 6 : 5)]
  }, [q, search, data])

  useEffect(() => { if (open) { setQ(''); setIndex(0) } }, [open])
  useEffect(() => { setIndex(0) }, [items.length])

  if (!open) return null
  const go = (item) => { navigate(item.link); onClose() }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && items[index]) go(items[index])
    if (e.key === 'Escape') onClose()
  }

  let lastGroup = null
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-[2px] animate-in" onMouseDown={onClose}>
      <div className="w-full max-w-xl animate-pop overflow-hidden rounded-2xl border border-border bg-card shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 text-muted-foreground" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Client, téléphone, immatriculation, n° de dossier…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
          {isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">Échap</kbd>}
        </div>
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">Aucun résultat pour « {q} »</p>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? (lastGroup = item.group) : null
            return (
              <div key={`${item.group}-${item.link}-${i}`}>
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{header}</p>}
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer', i === index && 'bg-muted')}
                >
                  <span className={cn('flex size-8 items-center justify-center rounded-lg border border-border bg-card', i === index && 'border-primary/30 text-primary')}>
                    {item.icon && <item.icon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                  </span>
                  {item.tag && <span className="text-[11px] text-muted-foreground">{item.tag}</span>}
                  {i === index && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
