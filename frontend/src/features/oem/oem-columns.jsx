import { Boxes, GitCompareArrows } from 'lucide-react'

import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { OEM_STATUSES } from '@/lib/choices'
import { formatMoney } from '@/lib/utils'

function Price({ label, value }) {
  return (
    <span className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{value != null ? formatMoney(value, { currency: false }) : '—'}</span>
    </span>
  )
}

export const oemColumns = ({ withVehicle = false } = {}) => [
  {
    key: 'designation', header: 'Pièce', sortKey: 'designation', mobile: 'title',
    render: (o) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{o.designation}</p>
        <p className="truncate text-xs text-muted-foreground">{o.family}{withVehicle && ` · ${o.brand} ${o.model} ${o.year ?? ''}`}</p>
      </div>
    ),
  },
  {
    key: 'oem', header: 'Référence OEM', mobile: 'subtitle',
    render: (o) => o.oem_reference ? (
      <div>
        <span className="font-mono text-[13px] font-semibold">{o.oem_reference}</span>
        {o.superseded_reference && <p className="font-mono text-[11px] text-muted-foreground">remplace {o.superseded_reference}</p>}
      </div>
    ) : <span className="text-sm italic text-muted-foreground">Inconnue</span>,
  },
  { key: 'status', header: 'Statut', sortKey: 'status', render: (o) => <StatusBadge list={OEM_STATUSES} value={o.status} /> },
  {
    key: 'variant', header: 'Position / variante', responsive: 'hidden 2xl:table-cell',
    render: (o) => <div className="max-w-56 text-xs text-muted-foreground"><p className="truncate">{o.position || '—'}</p><p className="truncate">{o.variant}</p></div>,
  },
  {
    key: 'prices', header: 'Prix Maroc (MAD)', responsive: 'hidden xl:table-cell',
    render: (o) => <div className="w-36"><Price label="OEM" value={o.price_oem} /><Price label="Adapt." value={o.price_aftermarket} /><Price label="Occas." value={o.price_used} /></div>,
  },
  {
    key: 'links', header: 'Équiv. / stock', align: 'right',
    render: (o) => (
      <div className="flex justify-end gap-1.5">
        <Badge tone={o.equivalences.length ? 'blue' : 'neutral'}><GitCompareArrows className="size-3" />{o.equivalences.length}</Badge>
        <Badge tone={o.stock_matches.some((p) => p.quantity > 0) ? 'green' : 'neutral'}><Boxes className="size-3" />{o.stock_matches.reduce((n, p) => n + p.quantity, 0)}</Badge>
      </div>
    ),
  },
]
