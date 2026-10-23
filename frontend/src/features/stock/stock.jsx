import { AlertTriangle, ArrowLeftRight, Boxes, CheckCircle2, PackagePlus } from 'lucide-react'
import { useState } from 'react'

import { CrudPage } from '@/components/common/crud-page'
import { FormPanel } from '@/components/common/form-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/tabs'
import { resources } from '@/lib/api'
import { MOVEMENT_KINDS, PART_CATEGORIES, PART_CONDITIONS, toneOf } from '@/lib/choices'
import { cn, formatDate } from '@/lib/utils'
import { movementDefaults, movementFields } from './movement-fields'
import { partFields } from './part-fields'

export function StockLevel({ p }) {
  const pct = Math.min(100, (p.quantity / Math.max(1, p.min_quantity * 3)) * 100)
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
        <div className={cn('h-full rounded-full', p.quantity <= 0 ? 'bg-red-500' : p.is_low ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
      <span className={cn('w-8 text-right font-semibold tabular', p.quantity <= 0 ? 'text-red-600' : p.is_low && 'text-amber-600')}>{p.quantity}</span>
    </div>
  )
}

export const partColumns = [
  {
    key: 'part', header: 'Pièce', sortKey: 'designation', mobile: 'title',
    render: (p) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{p.designation}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{p.reference}{p.oem_reference ? ` · OEM ${p.oem_reference}` : ' · OEM inconnue'}</p>
      </div>
    ),
  },
  { key: 'category', header: 'Catégorie', render: (p) => <span className="text-muted-foreground">{p.category_label}</span> },
  {
    key: 'compat', header: 'Compatibilité', mobile: 'subtitle',
    render: (p) => (
      <div className="flex items-center gap-1.5">
        {p.compatibility_verified ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" /> : <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />}
        <span className="truncate text-sm">{p.brand ? `${p.brand} ${p.compatible_models}` : 'Universelle'}</span>
      </div>
    ),
  },
  { key: 'condition', header: 'État', render: (p) => <Badge tone={toneOf(PART_CONDITIONS, p.condition)}>{p.condition_label}</Badge> },
  { key: 'location', header: 'Empl.', render: (p) => <span className="font-mono text-xs">{p.location || '—'}</span> },
  { key: 'price', header: 'Prix vente HT', align: 'right', sortKey: 'sale_price', render: (p) => <Money value={p.sale_price} /> },
  { key: 'qty', header: 'Stock', align: 'right', sortKey: 'quantity', render: (p) => <StockLevel p={p} /> },
]

const movementColumns = [
  { key: 'date', header: 'Date', render: (m) => <span className="text-muted-foreground">{formatDate(m.date)}</span> },
  { key: 'part', header: 'Pièce', mobile: 'title', render: (m) => <span className="font-medium">{m.part_label}</span> },
  { key: 'kind', header: 'Mouvement', mobile: 'subtitle', render: (m) => <StatusBadge list={MOVEMENT_KINDS} value={m.kind} dot={false} /> },
  { key: 'qty', header: 'Quantité', align: 'right', render: (m) => <span className={cn('font-semibold tabular', m.signed_quantity < 0 ? 'text-red-600' : 'text-emerald-600')}>{m.signed_quantity > 0 ? '+' : ''}{m.signed_quantity}</span> },
  { key: 'ro', header: 'Dossier', render: (m) => <span className="font-mono text-xs">{m.repair_order_number || '—'}</span> },
  { key: 'reason', header: 'Motif', render: (m) => <span className="text-muted-foreground">{m.reason || '—'}</span> },
]

export default function Stock() {
  const [view, setView] = useState('parts')
  const [moving, setMoving] = useState(false)
  const toggle = <Segmented value={view} onChange={setView} options={[{ value: 'parts', label: 'Catalogue', icon: Boxes }, { value: 'movements', label: 'Mouvements', icon: ArrowLeftRight }]} />

  return (
    <>
      <PageHeader
        title="Stock & pièces"
        description="Catalogue, emplacements, mouvements et alertes de rupture."
        actions={
          <>
            {toggle}
            <Button icon={ArrowLeftRight} onClick={() => setMoving(true)}>Mouvement</Button>
            <Button icon={PackagePlus} onClick={() => window.open('/api/exports/stock.csv', '_blank')}>Exporter</Button>
          </>
        }
      />
      {view === 'parts' ? (
        <CrudPage
          key="parts"
          embedded
          resource={resources.parts}
          columns={partColumns}
          fields={partFields(false)}
          newLabel="Nouvelle pièce"
          panelTitle={(p) => p.designation}
          panelIcon={Boxes}
          emptyIcon={Boxes}
          defaults={{ category: 'other', condition: 'new', min_quantity: 1, quantity: 0, compatibility_verified: false }}
          searchPlaceholder="Référence, OEM, désignation, modèle…"
          filters={[
            { name: 'low', label: '', segmented: true, default: '', options: [{ value: '', label: 'Tout' }, { value: '1', label: 'Stock bas' }] },
            { name: 'category', label: 'Toutes catégories', options: PART_CATEGORIES },
          ]}
          createFields={partFields(true)}
        />
      ) : (
        <CrudPage key="movements" embedded resource={resources.movements} columns={movementColumns} emptyIcon={ArrowLeftRight}
          searchPlaceholder="Pièce, dossier, motif…" filters={[{ name: 'kind', label: 'Tous les mouvements', options: MOVEMENT_KINDS }]} />
      )}
      <FormPanel open={moving} onClose={() => setMoving(false)} resource={resources.movements} fields={movementFields()} defaults={movementDefaults()}
        title="Nouveau mouvement de stock" icon={ArrowLeftRight} related={['parts', 'repair-orders']} success="Mouvement enregistré" />
    </>
  )
}

