import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { useConfirm } from '@/context/confirm-dialog-provider'
import { useItem, useRemove, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { OEM_EQUIVALENCE_KINDS } from '@/lib/choices'
import { formatMoney } from '@/lib/utils'

/** Equivalences and stock matches of one OEM line, editable from its side panel. */
export function OemEquivalenceList({ oemId }) {
  const { data: oem } = useItem(resources.oemReferences, oemId)
  const [draft, setDraft] = useState({ kind: 'aftermarket', manufacturer: '', reference: '' })
  const confirm = useConfirm()
  const related = ['oem-references']
  const save = useSave(resources.oemEquivalences, { related, success: 'Équivalence ajoutée', onSuccess: () => setDraft({ kind: 'aftermarket', manufacturer: '', reference: '' }) })
  const remove = useRemove(resources.oemEquivalences, { related })
  if (!oem?.id) return null

  const del = async (e) => {
    if (await confirm({ title: `Supprimer l’équivalence ${e.reference} ?`, variant: 'destructive', confirmLabel: 'Supprimer' })) remove.mutate(e.id)
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Équivalences</p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {oem.equivalences.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Aucune équivalence enregistrée.</li>}
          {oem.equivalences.map((e) => (
            <li key={e.id} className="group flex items-center gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  <span className="font-mono">{e.reference}</span>{e.verified && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">{[e.manufacturer, e.price != null && formatMoney(e.price), e.supplier_name].filter(Boolean).join(' · ')}</p>
              </div>
              <StatusBadge list={OEM_EQUIVALENCE_KINDS} value={e.kind} dot={false} />
              <button type="button" onClick={() => del(e)} className="rounded-md p-1 text-muted-foreground opacity-0 hover:text-red-600 group-hover:opacity-100 cursor-pointer"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Select value={draft.kind} options={OEM_EQUIVALENCE_KINDS} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} />
          <Input placeholder="Fabricant" value={draft.manufacturer} onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })} />
          <Input placeholder="Référence équivalente" className="font-mono" value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value.toUpperCase() })} />
          <Button icon={Plus} disabled={!draft.reference.trim()} loading={save.isPending} onClick={() => save.mutate({ ...draft, oem: oem.id })}>Ajouter</Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Une équivalence n’est « vérifiée » qu’avec sa source et sa date (onglet Équivalences).</p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Correspondances dans le stock</p>
        {oem.stock_matches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">Aucune pièce du stock ne correspond à la référence OEM, à sa supersession ou à ses équivalences.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {oem.stock_matches.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium">{p.designation}</span><span className="font-mono text-xs text-muted-foreground">{p.reference} · {p.condition}</span></span>
                <span className="text-right"><span className="block font-semibold tabular">{p.quantity} en stock</span><span className="text-xs text-muted-foreground">{formatMoney(p.sale_price)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
