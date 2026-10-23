import { Boxes, GripVertical, Plus, Trash2, Wrench } from 'lucide-react'

import { ResourceSelect } from '@/components/common/resource-select'
import { Button } from '@/components/ui/button'
import { resources } from '@/lib/api'
import { LINE_OPERATIONS, labelOf } from '@/lib/choices'
import { cn, formatMoney } from '@/lib/utils'

export function lineAmounts(l, rates) {
  const ht = Math.round(Number(l.quantity || 0) * Number(l.unit_price || 0) * (1 - Number(l.discount_pct || 0) / 100) * 100) / 100
  const rate = l.vat_rate ?? (l.line_type === 'part' ? rates.parts : rates.services)
  const vat = Math.round(ht * Number(rate || 0)) / 100
  return { ht, vat, ttc: ht + vat, rate: Number(rate || 0) }
}

export function computeTotals(lines, rates) {
  const t = { parts_ht: 0, parts_vat: 0, services_ht: 0, services_vat: 0 }
  lines.forEach((l) => {
    const a = lineAmounts(l, rates)
    if (l.line_type === 'part') { t.parts_ht += a.ht; t.parts_vat += a.vat } else { t.services_ht += a.ht; t.services_vat += a.vat }
  })
  return {
    ...t, parts_ttc: t.parts_ht + t.parts_vat, services_ttc: t.services_ht + t.services_vat,
    total_ht: t.parts_ht + t.services_ht, total_vat: t.parts_vat + t.services_vat,
    total_ttc: t.parts_ht + t.parts_vat + t.services_ht + t.services_vat,
  }
}

const cellInput = 'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition-colors hover:border-input focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/10 disabled:hover:border-transparent'

/** Quote / invoice lines. Parts on a yellow background, services on white, as on the printed document. */
export function LinesEditor({ lines, onChange, rates, locked }) {
  const update = (i, patch) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const remove = (i) => onChange(lines.filter((_, j) => j !== i))
  const add = (line) => onChange([...lines, { quantity: 1, unit_price: 0, discount_pct: 0, operation: '', comment: '', reference: '', designation: '', ...line }])
  const fromCatalog = (_id, p) => p && add({ line_type: 'part', part: p.id, reference: p.oem_reference || p.reference, designation: p.designation, unit_price: p.sale_price, operation: 'replace_new' })

  const sorted = [...lines.map((l, i) => ({ l, i })).filter((x) => x.l.line_type === 'part'), ...lines.map((l, i) => ({ l, i })).filter((x) => x.l.line_type !== 'part')]

  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-5" />
              <th className="h-9 w-32 px-2 text-left font-medium">Référence</th>
              <th className="px-2 text-left font-medium">Désignation</th>
              <th className="w-40 px-2 text-left font-medium">Opération</th>
              <th className="w-16 px-2 text-right font-medium">Qté</th>
              <th className="w-24 px-2 text-right font-medium">P.U. HT</th>
              <th className="w-16 px-2 text-right font-medium">Rem. %</th>
              <th className="w-24 px-2 text-right font-medium">Montant HT</th>
              <th className="w-12 px-2 text-right font-medium">TVA</th>
              <th className="w-24 px-2 text-right font-medium">TTC</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ l, i }, k) => {
              const a = lineAmounts(l, rates)
              const isPart = l.line_type === 'part'
              const firstService = !isPart && (k === 0 || sorted[k - 1].l.line_type === 'part')
              return [
                (k === 0 && isPart) || firstService ? (
                  <tr key={`h${i}`}>
                    <td colSpan={11} className={cn('px-2 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider', isPart ? 'text-part-row-foreground' : 'text-muted-foreground')}>
                      {isPart ? 'Pièces' : 'Prestations & main-d’œuvre'}
                    </td>
                  </tr>
                ) : null,
                <tr key={i} className={cn('group border-b', isPart ? 'border-part-row-strong/70 bg-part-row' : 'border-border bg-card')}>
                  <td className="pl-1 text-muted-foreground/40">{!locked && <GripVertical className="size-3.5" />}</td>
                  {locked ? (
                    <>
                      <td className="truncate px-3 py-2.5 font-mono text-xs">{l.reference || '—'}</td>
                      <td className="px-3 py-2.5">{l.designation}{l.comment && <span className="block text-xs text-muted-foreground">{l.comment}</span>}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-1"><input className={cn(cellInput, 'font-mono text-xs')} value={l.reference ?? ''} placeholder={isPart ? 'Réf. OEM' : '—'} onChange={(e) => update(i, { reference: e.target.value })} /></td>
                      <td className="p-1">
                        <input className={cellInput} value={l.designation} placeholder="Désignation" onChange={(e) => update(i, { designation: e.target.value })} />
                        <input className={cn(cellInput, 'h-6 text-xs text-muted-foreground')} value={l.comment ?? ''} placeholder="Commentaire / justification" onChange={(e) => update(i, { comment: e.target.value })} />
                      </td>
                    </>
                  )}
                  <td className="p-1">
                    {locked ? <span className="px-2 text-xs">{l.operation ? labelOf(LINE_OPERATIONS, l.operation) : '—'}</span> : (
                      <select className={cn(cellInput, 'cursor-pointer text-xs')} value={l.operation ?? ''} onChange={(e) => update(i, { operation: e.target.value })}>
                        <option value="">—</option>
                        {LINE_OPERATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="p-1">{locked ? <span className="block px-2 text-right tabular">{Number(l.quantity)}</span> : <input type="number" step="0.5" className={cn(cellInput, 'text-right tabular')} value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />}</td>
                  <td className="p-1">{locked ? <span className="block px-2 text-right tabular">{formatMoney(l.unit_price, { currency: false })}</span> : <input type="number" step="0.01" className={cn(cellInput, 'text-right tabular')} value={l.unit_price} onChange={(e) => update(i, { unit_price: e.target.value })} />}</td>
                  <td className="p-1">{locked ? <span className="block px-2 text-right text-muted-foreground tabular">{Number(l.discount_pct) || '—'}</span> : <input type="number" step="1" className={cn(cellInput, 'text-right tabular')} value={l.discount_pct} onChange={(e) => update(i, { discount_pct: e.target.value })} />}</td>
                  <td className="px-2 text-right font-medium tabular">{formatMoney(a.ht, { currency: false })}</td>
                  <td className="px-2 text-right text-xs text-muted-foreground tabular">{a.rate}%</td>
                  <td className="px-2 text-right tabular">{formatMoney(a.ttc, { currency: false })}</td>
                  <td className="pr-1 text-right">
                    {!locked && (
                      <button onClick={() => remove(i)} className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer" aria-label="Supprimer la ligne">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>,
              ]
            })}
            {lines.length === 0 && (
              <tr><td colSpan={11} className="py-12 text-center text-sm text-muted-foreground">Aucune ligne. Ajoutez des pièces et des prestations.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!locked && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
          <Button size="sm" icon={Plus} className="border-part-row-strong bg-part-row text-part-row-foreground hover:bg-part-row-strong" onClick={() => add({ line_type: 'part', operation: 'replace_new' })}>Pièce</Button>
          <Button size="sm" icon={Wrench} onClick={() => add({ line_type: 'service', operation: 'labor' })}>Prestation</Button>
          <div className="w-full sm:w-80">
            <ResourceSelect resource={resources.parts} value={null} onChange={fromCatalog} clearable={false}
              placeholder="＋ Ajouter depuis le catalogue de pièces…" getLabel={(p) => `${p.reference} · ${p.designation}`}
              getSubLabel={(p) => `${formatMoney(p.sale_price)} · ${p.quantity} en stock${p.compatibility_verified ? '' : ' · compatibilité à vérifier'}`} />
          </div>
          <Boxes className="hidden size-4 text-muted-foreground sm:block" />
        </div>
      )}
    </div>
  )
}

function Row({ label, value, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-6 py-1.5 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span><span className="font-medium tabular">{formatMoney(value)}</span>
    </div>
  )
}

export function TotalsRecap({ totals, insurance, paid }) {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-part-row px-4 py-2 text-part-row-foreground">
        <Row label="Total pièces HT" value={totals.parts_ht} />
        <Row label="TVA sur pièces" value={totals.parts_vat} />
        <Row label="Total pièces TTC" value={totals.parts_ttc} className="font-semibold" />
      </div>
      <div className="px-4 py-2">
        <Row label="Total prestations HT" value={totals.services_ht} />
        {totals.services_vat > 0 && <Row label="TVA sur prestations" value={totals.services_vat} />}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-sidebar px-4 py-3.5 text-white">
        <span className="text-sm font-medium text-white/70">Net à payer</span>
        <span className="text-xl font-semibold tracking-tight tabular">{formatMoney(totals.total_ttc)}</span>
      </div>
      {insurance > 0 && (
        <div className="px-4 pt-2">
          <Row label="Part assurance" value={insurance} />
          <Row label="Part client" value={totals.total_ttc - insurance} />
        </div>
      )}
      {paid != null && (
        <div className="px-4 pt-1">
          <Row label="Déjà payé" value={paid} />
          <Row label="Reste à payer" value={totals.total_ttc - paid} className="[&>span:last-child]:text-red-600" />
        </div>
      )}
    </div>
  )
}
