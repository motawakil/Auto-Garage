import { Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSave } from '@/hooks/use-resource'
import { LinesEditor, TotalsRecap, computeTotals } from './lines-editor'
import { useGarageSettings } from './use-settings'

const LINE_KEYS = ['line_type', 'part', 'reference', 'designation', 'operation', 'quantity', 'unit_price', 'discount_pct', 'vat_rate', 'comment']

/** Lines + live totals for a quote or invoice, with a sticky save bar when there are unsaved edits. */
export function DocumentEditor({ doc, resource, related = [], insurance, paid }) {
  const { data: cfg } = useGarageSettings()
  const rates = { parts: cfg?.parts_vat_rate ?? 20, services: cfg?.services_vat_rate ?? 0 }
  const [lines, setLines] = useState(doc.lines)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { setLines(doc.lines); setDirty(false) }, [doc])
  const totals = useMemo(() => computeTotals(lines, rates), [lines, rates.parts, rates.services]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = useSave(resource, { related, success: 'Lignes enregistrées', onSuccess: () => setDirty(false) })

  const persist = () => {
    const invalid = lines.find((l) => !l.designation?.trim())
    if (invalid) return toast.error('Chaque ligne doit avoir une désignation.')
    save.mutate({ id: doc.id, lines: lines.map((l, i) => ({ ...Object.fromEntries(LINE_KEYS.map((k) => [k, l[k] ?? (k === 'vat_rate' || k === 'part' ? null : '')])), position: i })) })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <LinesEditor lines={lines} rates={rates} locked={doc.is_locked} onChange={(l) => { setLines(l); setDirty(true) }} />
        <div className="flex flex-col gap-6 border-t border-border p-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md text-xs leading-relaxed text-muted-foreground">
            <p>Pièces : TVA {rates.parts}% appliquée. Prestations : maintenues en HT{rates.services > 0 ? ` (TVA ${rates.services}%)` : ''}, selon la configuration du garage.</p>
            <p className="mt-1.5">Présentation à confirmer avec les obligations fiscales applicables au Maroc avant usage comme facture officielle.</p>
            {doc.is_locked && <p className="mt-3 font-medium text-foreground">Document verrouillé — toute modification passe par une nouvelle version ou une annulation motivée.</p>}
          </div>
          <TotalsRecap totals={totals} insurance={insurance} paid={paid} />
        </div>
      </Card>
      {dirty && !doc.is_locked && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit animate-pop items-center gap-3 rounded-2xl border border-border bg-card py-2 pl-4 pr-2 shadow-pop">
          <span className="size-2 animate-pulse rounded-full bg-amber-500" />
          <span className="text-sm">Modifications non enregistrées</span>
          <Button size="sm" onClick={() => { setLines(doc.lines); setDirty(false) }}>Annuler</Button>
          <Button size="sm" variant="primary" icon={Save} loading={save.isPending} onClick={persist}>Enregistrer</Button>
        </div>
      )}
    </>
  )
}
