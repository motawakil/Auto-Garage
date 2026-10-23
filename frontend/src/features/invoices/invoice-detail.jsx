import { AlertOctagon, Ban, Printer, Send, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { FormPanel } from '@/components/common/form-panel'
import { PageHeader } from '@/components/common/page-header'
import { ResourceTable } from '@/components/common/resource-table'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/context/confirm-dialog-provider'
import { useItem, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { INVOICE_STATUSES } from '@/lib/choices'
import { formatMoney } from '@/lib/utils'
import { paymentColumns } from '@/features/payments/payment-columns'
import { paymentDefaults, paymentFields } from '@/features/payments/payment-fields'
import { DocumentEditor } from '@/features/quotes/document-editor'

export default function InvoiceDetail() {
  const { id } = useParams()
  const confirm = useConfirm()
  const { data: inv, isLoading } = useItem(resources.invoices, id)
  const [meta, setMeta] = useState({})
  const [paying, setPaying] = useState(false)
  useEffect(() => { if (inv) setMeta({ date: inv.date, due_date: inv.due_date ?? '', insurance_amount: inv.insurance_amount, notes: inv.notes }) }, [inv])
  const save = useSave(resources.invoices, { related: ['repair-orders', 'payments'] })

  if (isLoading || !inv) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>
  const draft = inv.status === 'draft'

  const issue = async () => {
    if (await confirm({ title: 'Émettre la facture ?', description: 'Une facture émise ne peut plus être modifiée sans trace. Les corrections passeront par une annulation motivée.', confirmLabel: 'Émettre' }))
      save.mutate({ id: inv.id, ...meta, due_date: meta.due_date || null, status: 'issued' })
  }
  const cancel = async () => {
    const reason = await confirm({ title: 'Annuler la facture ?', description: 'Le motif est conservé dans l’historique.', reason: true, variant: 'destructive', confirmLabel: 'Annuler la facture' })
    if (reason) save.mutate({ id: inv.id, status: 'cancelled', cancel_reason: reason })
  }
  const dispute = async () => {
    if (await confirm({ title: 'Marquer en litige ?' })) save.mutate({ id: inv.id, status: 'disputed' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Factures', to: '/factures' }, { label: inv.repair_order_number, to: `/dossiers/${inv.repair_order}` }, { label: inv.number }]}
        title={<span className="font-mono">{inv.number}</span>}
        actions={
          <>
            <Button icon={Printer} onClick={() => window.open(`/imprimer/facture/${inv.id}`, '_blank')}>Imprimer / PDF</Button>
            {draft && <Button variant="primary" icon={Send} onClick={issue} loading={save.isPending}>Émettre la facture</Button>}
            {!draft && !['cancelled', 'paid'].includes(inv.status) && <Button variant="primary" icon={Wallet} onClick={() => setPaying(true)}>Encaisser</Button>}
          </>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge list={INVOICE_STATUSES} value={inv.status} />
          <Link to={`/clients/${inv.client_id}`} className="hover:text-foreground">{inv.client_name}</Link>·<span>{inv.vehicle_label}</span>
          {inv.quote_number && <>· <span>Devis {inv.quote_number}</span></>}
        </div>
        {inv.status === 'cancelled' && <p className="mt-2 text-sm text-red-600">Annulée : {inv.cancel_reason}</p>}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Total TTC', inv.totals.total_ttc],
          ['Part assurance', inv.insurance_amount],
          ['Encaissé', inv.paid, 'text-emerald-600'],
          ['Reste dû', inv.balance, Number(inv.balance) > 0 ? 'text-red-600' : ''],
        ].map(([l, v, cls]) => (
          <Card key={l} className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className={`mt-1 text-lg font-semibold tabular ${cls ?? ''}`}>{formatMoney(v)}</p></Card>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <DocumentEditor doc={inv} resource={resources.invoices} related={['repair-orders']} insurance={Number(inv.insurance_amount)} paid={Number(inv.paid)} />
          <ResourceTable title="Paiements affectés" resource={resources.payments} params={{ invoice: inv.id }} columns={paymentColumns({ withClient: false })}
            emptyIcon={Wallet} emptyTitle="Aucun paiement" action={!draft && <Button size="sm" icon={Wallet} onClick={() => setPaying(true)}>Encaisser</Button>} />
        </div>
        <Card className="h-fit space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" disabled={!draft} value={meta.date ?? ''} onChange={(e) => setMeta({ ...meta, date: e.target.value })} /></Field>
            <Field label="Échéance"><Input type="date" value={meta.due_date ?? ''} onChange={(e) => setMeta({ ...meta, due_date: e.target.value })} /></Field>
          </div>
          <Field label="Part prise en charge par l’assurance (TTC)">
            <Input type="number" step="0.01" suffix="MAD" disabled={!draft} value={meta.insurance_amount ?? ''} onChange={(e) => setMeta({ ...meta, insurance_amount: e.target.value })} />
          </Field>
          <Field label="Notes"><Textarea value={meta.notes ?? ''} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} /></Field>
          <Button className="w-full" loading={save.isPending}
            onClick={() => save.mutate(draft ? { id: inv.id, ...meta, due_date: meta.due_date || null } : { id: inv.id, notes: meta.notes, due_date: meta.due_date || null })}>
            Enregistrer
          </Button>
          {!draft && inv.status !== 'cancelled' && (
            <div className="flex gap-2 border-t border-border pt-4">
              <Button size="sm" variant="ghost" className="flex-1" icon={AlertOctagon} onClick={dispute}>Litige</Button>
              <Button size="sm" variant="ghost" className="flex-1 text-red-600" icon={Ban} onClick={cancel}>Annuler</Button>
            </div>
          )}
        </Card>
      </div>

      <FormPanel open={paying} onClose={() => setPaying(false)} resource={resources.payments} fields={paymentFields}
        defaults={{ ...paymentDefaults(), client: inv.client_id, repair_order: inv.repair_order, invoice: inv.id, amount: inv.balance }}
        title="Encaisser la facture" icon={Wallet} related={['invoices', 'repair-orders']} success="Paiement enregistré" />
    </div>
  )
}
