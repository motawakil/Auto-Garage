import { Banknote, CheckCircle2, Landmark, Undo2, Wallet, XCircle } from 'lucide-react'

import { CrudPage } from '@/components/common/crud-page'
import { StatCard } from '@/components/common/stat-card'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/context/confirm-dialog-provider'
import { useAction, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { CHEQUE_STATUSES, PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_ORIGINS } from '@/lib/choices'
import { formatMoney } from '@/lib/utils'
import { useDashboard } from '@/features/dashboard/use-dashboard'
import { paymentColumns } from './payment-columns'
import { paymentDefaults, paymentFields } from './payment-fields'

function ChequeActions({ p }) {
  const save = useSave(resources.payments, { related: ['invoices', 'repair-orders'], success: 'Chèque mis à jour' })
  const confirm = useConfirm()
  if (p.method !== 'cheque' || p.is_cancelled || !['received', 'pending'].includes(p.cheque_status)) return null
  const reject = async () => {
    if (await confirm({ title: 'Chèque rejeté ?', description: 'Le montant sera retiré des encaissements attendus.', variant: 'destructive', confirmLabel: 'Marquer rejeté' }))
      save.mutate({ id: p.id, cheque_status: 'rejected' })
  }
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="soft" icon={CheckCircle2} onClick={() => save.mutate({ id: p.id, cheque_status: 'cashed' })}>Encaissé</Button>
      <Button size="icon-sm" variant="ghost" icon={XCircle} onClick={reject} aria-label="Rejeté" />
    </div>
  )
}

function CancelPayment({ values }) {
  const confirm = useConfirm()
  const cancel = useAction(resources.payments, 'cancel', { related: ['invoices', 'repair-orders'], success: 'Paiement annulé' })
  if (!values.id || values.is_cancelled) return values.is_cancelled ? <p className="mt-5 text-sm text-red-600">Paiement annulé : {values.reason}</p> : null
  const run = async () => {
    const reason = await confirm({ title: 'Annuler ce paiement ?', description: 'Le paiement est conservé dans l’historique mais n’est plus compté.', reason: true, variant: 'destructive', confirmLabel: 'Annuler le paiement' })
    if (reason) cancel.mutate({ id: values.id, reason })
  }
  return (
    <div className="mt-6 rounded-xl border border-border p-4">
      <p className="text-sm font-medium">Corriger une erreur</p>
      <p className="mt-1 text-xs text-muted-foreground">Les paiements ne se suppriment pas : annulez avec un motif, ou enregistrez un remboursement.</p>
      <Button size="sm" className="mt-3" icon={Undo2} onClick={run} loading={cancel.isPending}>Annuler le paiement</Button>
    </div>
  )
}

export default function Payments() {
  const { data, isLoading } = useDashboard()
  const f = data?.finance ?? {}
  const columns = [...paymentColumns(), { key: 'actions', header: '', align: 'right', mobile: 'hidden', render: (p) => <ChequeActions p={p} /> }]

  return (
    <CrudPage
      title="Paiements"
      description="Encaissements, acomptes, chèques et remboursements. Un chèque n’est compté qu’une fois encaissé."
      resource={resources.payments}
      columns={columns}
      fields={paymentFields}
      defaults={paymentDefaults()}
      newLabel="Enregistrer un paiement"
      panelTitle={(p) => `Paiement ${p.number}`}
      panelIcon={Wallet}
      emptyIcon={Wallet}
      deletable={false}
      openOnNew
      related={['invoices', 'repair-orders', 'clients']}
      searchPlaceholder="Référence, banque, client, dossier, facture…"
      panelExtra={(v) => <CancelPayment values={v} />}
      filters={[
        { name: 'method', label: 'Tous les modes', options: PAYMENT_METHODS },
        { name: 'kind', label: 'Toutes opérations', options: PAYMENT_KINDS },
        { name: 'origin', label: 'Toutes origines', options: PAYMENT_ORIGINS },
        { name: 'cheque_status', label: 'Statut chèque', options: CHEQUE_STATUSES },
      ]}
      exportName="paiements"
      header={
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Encaissé ce mois" value={formatMoney(f.month_collected)} icon={Banknote} accent="green" loading={isLoading} />
          <StatCard label="Chèques en attente" value={formatMoney(f.pending_cheques_amount)} hint={`${f.pending_cheques_count ?? 0} chèque(s)`} icon={Landmark} accent="amber" loading={isLoading} />
          <StatCard label="Factures à encaisser" value={formatMoney(f.unpaid_amount)} hint={`${f.unpaid_count ?? 0} facture(s)`} icon={Wallet} accent="red" loading={isLoading} />
          <StatCard label="Dû par les assurances" value={formatMoney(f.insurance_receivable)} icon={Landmark} accent="violet" loading={isLoading} />
        </div>
      }
    />
  )
}
