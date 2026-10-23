import { CheckCircle2, GitCompareArrows } from 'lucide-react'

import { CrudPage } from '@/components/common/crud-page'
import { StatusBadge } from '@/components/common/status-badge'
import { resources } from '@/lib/api'
import { OEM_EQUIVALENCE_KINDS } from '@/lib/choices'
import { formatMoney } from '@/lib/utils'
import { equivalenceFields } from './oem-fields'

const columns = [
  { key: 'reference', header: 'Référence équivalente', mobile: 'title',
    render: (e) => <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold">{e.reference}{e.verified && <CheckCircle2 className="size-3.5 text-emerald-500" />}</span> },
  { key: 'manufacturer', header: 'Fabricant', render: (e) => e.manufacturer || '—' },
  { key: 'kind', header: 'Type', render: (e) => <StatusBadge list={OEM_EQUIVALENCE_KINDS} value={e.kind} dot={false} /> },
  { key: 'oem', header: 'Ligne OEM', mobile: 'subtitle',
    render: (e) => <div><p className="truncate">{e.oem_label}</p><p className="font-mono text-xs text-muted-foreground">{e.oem_reference || 'OEM inconnue'}</p></div> },
  { key: 'price', header: 'Prix', align: 'right', render: (e) => (e.price != null ? <span className="tabular">{formatMoney(e.price)}</span> : '—') },
  { key: 'supplier', header: 'Fournisseur', render: (e) => e.supplier_name || '—' },
]

export function OemEquivalences() {
  return (
    <CrudPage
      embedded
      resource={resources.oemEquivalences}
      columns={columns}
      fields={equivalenceFields}
      defaults={{ kind: 'aftermarket', verified: false }}
      newLabel="Nouvelle équivalence"
      panelTitle={(e) => e.reference}
      panelIcon={GitCompareArrows}
      emptyIcon={GitCompareArrows}
      related={['oem-references']}
      searchPlaceholder="Référence, fabricant, pièce…"
      filters={[
        { name: 'kind', label: 'Tous les types', options: OEM_EQUIVALENCE_KINDS },
        { name: 'verified', label: '', segmented: true, default: '', options: [{ value: '', label: 'Toutes' }, { value: 'true', label: 'Vérifiées' }, { value: 'false', label: 'À vérifier' }] },
      ]}
    />
  )
}
