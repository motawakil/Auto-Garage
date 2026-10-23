import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { LogoMark } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { useItem } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { LINE_OPERATIONS, labelOf } from '@/lib/choices'
import { formatDate, formatMoney } from '@/lib/utils'
import { useGarageSettings } from '@/features/quotes/use-settings'

function LinesTable({ lines, title, part }) {
  if (!lines.length) return null
  return (
    <table className="mb-4 w-full border-collapse text-[11px]">
      <thead>
        <tr className={part ? 'bg-[#fde68a] text-zinc-900' : 'bg-zinc-900 text-white'}>
          <th className="px-2 py-1.5 text-left font-semibold" colSpan={2}>{title}</th>
          <th className="px-2 py-1.5 text-left font-semibold">Opération</th>
          <th className="px-2 py-1.5 text-right font-semibold">Qté</th>
          <th className="px-2 py-1.5 text-right font-semibold">P.U. HT</th>
          <th className="px-2 py-1.5 text-right font-semibold">Remise</th>
          <th className="px-2 py-1.5 text-right font-semibold">Montant HT</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.id} className={part ? 'bg-[#fef9c3]' : 'bg-white'} style={{ borderBottom: '1px solid #e4e4e7' }}>
            <td className="w-24 px-2 py-1.5 align-top font-mono text-[10px]">{l.reference || '—'}</td>
            <td className="px-2 py-1.5 align-top">{l.designation}{l.comment && <div className="text-[10px] text-zinc-500">{l.comment}</div>}</td>
            <td className="px-2 py-1.5 align-top">{l.operation ? labelOf(LINE_OPERATIONS, l.operation) : ''}</td>
            <td className="px-2 py-1.5 text-right align-top tabular">{Number(l.quantity)}</td>
            <td className="px-2 py-1.5 text-right align-top tabular">{formatMoney(l.unit_price, { currency: false })}</td>
            <td className="px-2 py-1.5 text-right align-top tabular">{Number(l.discount_pct) ? `${Number(l.discount_pct)}%` : ''}</td>
            <td className="px-2 py-1.5 text-right align-top font-medium tabular">{formatMoney(l.amount_ht, { currency: false })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Row({ label, value, bold }) {
  return <div className={`flex justify-between py-1 ${bold ? 'font-semibold' : ''}`}><span>{label}</span><span className="tabular">{formatMoney(value)}</span></div>
}

/** A4 printable quote / invoice. Browser print → "Enregistrer en PDF". */
export default function PrintDocument() {
  const { kind, id } = useParams()
  const isInvoice = kind === 'facture'
  const { data: doc } = useItem(isInvoice ? resources.invoices : resources.quotes, id)
  const { data: cfg } = useGarageSettings()
  const { data: ro } = useItem(resources.repairOrders, doc?.repair_order)
  const { data: client } = useQuery({ queryKey: ['clients', 'item', String(ro?.client)], queryFn: () => resources.clients.get(ro.client), enabled: !!ro })

  useEffect(() => { if (doc) document.title = `${isInvoice ? 'Facture' : 'Devis'} ${doc.number}` }, [doc, isInvoice])
  if (!doc || !cfg || !ro) return <div className="p-10 text-sm text-zinc-500">Préparation du document…</div>

  const t = doc.totals
  const parts = doc.lines.filter((l) => l.line_type === 'part')
  const services = doc.lines.filter((l) => l.line_type !== 'part')

  return (
    <div className="min-h-dvh bg-zinc-200 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-2">
        <Button icon={ArrowLeft} onClick={() => window.close()}>Fermer</Button>
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
      </div>
      <div className="mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white p-[14mm] text-zinc-900 shadow-xl print:shadow-none" style={{ colorScheme: 'light' }}>
        <header className="flex items-start justify-between border-b-2 border-red-600 pb-5">
          <div className="flex items-center gap-3">
            <LogoMark className="size-12" />
            <div>
              <p className="text-xl font-bold tracking-tight">{cfg.name}</p>
              <p className="text-[11px] text-zinc-500">{cfg.slogan}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{cfg.address}{cfg.city && `, ${cfg.city}`}<br />{cfg.phone} · {cfg.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold uppercase tracking-wide text-red-600">{isInvoice ? 'Facture' : 'Devis'}</p>
            <p className="font-mono text-sm font-semibold">{doc.number}{!isInvoice && ` · v${doc.version}`}</p>
            <p className="mt-1 text-[11px] text-zinc-600">Date : {formatDate(doc.date)}</p>
            {isInvoice ? doc.due_date && <p className="text-[11px] text-zinc-600">Échéance : {formatDate(doc.due_date)}</p>
              : doc.valid_until && <p className="text-[11px] text-zinc-600">Valable jusqu’au {formatDate(doc.valid_until)}</p>}
            {!isInvoice && <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-500">{doc.kind_label}</p>}
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-4 text-[11px]">
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Client</p>
            <p className="text-sm font-semibold">{client?.display_name ?? ro.client_name}</p>
            <p>{client?.address}{client?.city && `, ${client.city}`}</p>
            <p>{client?.phone}</p>
            {client?.ice && <p>ICE : {client.ice}</p>}
          </div>
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Véhicule · Dossier {ro.number}</p>
            <p className="text-sm font-semibold">{ro.vehicle_label}</p>
            <p>Kilométrage : {ro.mileage_in ?? '—'} km · Entrée le {formatDate(ro.entry_date)}</p>
            {ro.is_insurance && <p>Assurance : {ro.insurance_company_name} · Sinistre {ro.claim_number || '—'}</p>}
            {ro.expert_name && <p>Expert : {ro.expert_name}</p>}
          </div>
        </section>

        <section className="mt-5">
          <LinesTable lines={parts} title="Pièces" part />
          <LinesTable lines={services} title="Prestations & main-d’œuvre" />
        </section>

        <section className="mt-4 flex justify-end">
          <div className="w-72 text-[11px]">
            <div className="rounded-t-md bg-[#fef9c3] px-3 py-1.5">
              <Row label="Total pièces HT" value={t.parts_ht} />
              <Row label={`TVA pièces (${cfg.parts_vat_rate}%)`} value={t.parts_vat} />
              <Row label="Total pièces TTC" value={t.parts_ttc} bold />
            </div>
            <div className="px-3 py-1.5">
              <Row label="Total prestations HT" value={t.services_ht} />
              {t.services_vat > 0 && <Row label="TVA prestations" value={t.services_vat} />}
            </div>
            <div className="flex justify-between rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white">
              <span>Net à payer</span><span className="tabular">{formatMoney(t.total_ttc)}</span>
            </div>
            {isInvoice && Number(doc.insurance_amount) > 0 && (
              <div className="px-3 pt-2"><Row label="Part assurance" value={doc.insurance_amount} /><Row label="Part client" value={doc.client_share} /></div>
            )}
            {isInvoice && (
              <div className="px-3 pt-1"><Row label="Acomptes / paiements reçus" value={doc.paid} /><Row label="Solde restant" value={doc.balance} bold /></div>
            )}
          </div>
        </section>

        {doc.notes && <p className="mt-6 rounded-lg bg-zinc-50 p-3 text-[11px]"><span className="font-semibold">Notes : </span>{doc.notes}</p>}
        {!isInvoice && (
          <div className="mt-10 grid grid-cols-2 gap-8 text-[10px] text-zinc-500">
            <div className="h-20 rounded-lg border border-dashed border-zinc-300 p-2">Bon pour accord — signature du client</div>
            <div className="h-20 rounded-lg border border-dashed border-zinc-300 p-2">Cachet et signature du garage</div>
          </div>
        )}

        <footer className="mt-10 border-t border-zinc-200 pt-3 text-center text-[9px] leading-relaxed text-zinc-500">
          {cfg.invoice_footer && <p className="mb-1 text-zinc-700">{cfg.invoice_footer}</p>}
          <p>{cfg.name} · ICE {cfg.ice || '—'} · RC {cfg.rc || '—'} · IF {cfg.if_number || '—'}{cfg.patente && ` · Patente ${cfg.patente}`}{cfg.rib && ` · RIB ${cfg.rib}`}</p>
        </footer>
      </div>
    </div>
  )
}
