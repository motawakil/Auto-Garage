import { useQuery } from '@tanstack/react-query'
import { Banknote, Car, Download, FileSpreadsheet, FileText, Hourglass, Landmark, Percent, Receipt, Users, Wallet, Wrench } from 'lucide-react'
import { useState } from 'react'

import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { formatMoney, today } from '@/lib/utils'
import { DocumentsGallery } from './documents-gallery'

const EXPORTS = [
  { name: 'clients', label: 'Clients', icon: Users }, { name: 'vehicles', label: 'Véhicules', icon: Car },
  { name: 'dossiers', label: 'Dossiers de réparation', icon: Wrench }, { name: 'factures', label: 'Factures', icon: Receipt },
  { name: 'paiements', label: 'Paiements', icon: Wallet }, { name: 'stock', label: 'Stock & pièces', icon: FileSpreadsheet },
]

export default function Reports() {
  const [tab, setTab] = useState('finance')
  const [range, setRange] = useState({ from: `${new Date().getFullYear()}-01-01`, to: today() })
  const { data: r, isLoading } = useQuery({ queryKey: ['reports', range], queryFn: () => api.get('/reports/', { params: range }).then((x) => x.data) })

  return (
    <div className="space-y-6">
      <PageHeader title="Documents & rapports" description="Rentabilité, exports comptables et archive des documents." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'finance', label: 'Rentabilité', icon: Percent }, { value: 'exports', label: 'Exports', icon: Download }, { value: 'documents', label: 'Archive documents', icon: FileText }]} />

      {tab === 'finance' && (
        <>
          <Card className="flex flex-wrap items-end gap-3 p-4">
            <Field label="Du"><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
            <Field label="Au"><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
            <p className="pb-2 text-xs text-muted-foreground">Chiffre d’affaires facturé, argent encaissé, créances et marge sont des indicateurs distincts.</p>
          </Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
            <StatCard label="Facturé TTC" value={formatMoney(r?.invoiced_ttc)} icon={Receipt} accent="blue" loading={isLoading} />
            <StatCard label="Facturé HT" value={formatMoney(r?.invoiced_ht)} icon={Receipt} loading={isLoading} />
            <StatCard label="TVA collectée" value={formatMoney(r?.vat_collected)} icon={Percent} loading={isLoading} />
            <StatCard label="Encaissé" value={formatMoney(r?.collected)} icon={Banknote} accent="green" loading={isLoading} />
            <StatCard label="Chèques non encaissés" value={formatMoney(r?.pending_cheques)} icon={Landmark} accent="amber" loading={isLoading} />
            <StatCard label="Créances" value={formatMoney(r?.receivable)} icon={Hourglass} accent="red" loading={isLoading} />
          </div>
          <Card className="overflow-hidden">
            <CardHeader title="Rentabilité par type de service" description="Coûts = pièces sorties du stock + main-d’œuvre (temps × coût horaire)" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-y border-border text-xs text-muted-foreground">
                  <th className="h-10 px-5 text-left font-medium">Service</th><th className="px-4 text-right font-medium">Dossiers</th>
                  <th className="px-4 text-right font-medium">Facturé TTC</th><th className="px-4 text-right font-medium">Coûts</th>
                  <th className="px-5 text-right font-medium">Marge HT</th><th className="w-48 px-5" />
                </tr></thead>
                <tbody>
                  {(r?.by_type ?? []).map((row) => {
                    const pct = Number(row.invoiced) ? (Number(row.margin) / Number(row.invoiced)) * 100 : 0
                    return (
                      <tr key={row.label} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium">{row.label}</td>
                        <td className="px-4 text-right tabular">{row.count}</td>
                        <td className="px-4 text-right"><Money value={row.invoiced} /></td>
                        <td className="px-4 text-right text-muted-foreground"><Money value={row.costs} /></td>
                        <td className="px-5 text-right font-semibold"><Money value={row.margin} /></td>
                        <td className="px-5"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div><span className="w-10 text-right text-xs tabular">{pct.toFixed(0)}%</span></div></td>
                      </tr>
                    )
                  })}
                  {r && r.by_type.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Aucune facture sur la période.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'exports' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EXPORTS.map((e) => (
            <a key={e.name} href={`/api/exports/${e.name}.csv`} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><e.icon className="size-5" /></span>
              <span className="flex-1"><span className="block font-medium">{e.label}</span><span className="text-xs text-muted-foreground">CSV compatible Excel / SAGE</span></span>
              <Download className="size-4 text-muted-foreground group-hover:text-primary" />
            </a>
          ))}
        </div>
      )}

      {tab === 'documents' && <DocumentsGallery withLinks />}
    </div>
  )
}
