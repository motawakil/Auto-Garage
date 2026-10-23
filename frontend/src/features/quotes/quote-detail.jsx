import { Ban, Check, CopyPlus, FileCheck2, Printer, Receipt, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/context/confirm-dialog-provider'
import { useAction, useItem, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { QUOTE_KINDS, QUOTE_STATUSES } from '@/lib/choices'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { DocumentEditor } from './document-editor'

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { data: q, isLoading } = useItem(resources.quotes, id)
  const [meta, setMeta] = useState({})
  useEffect(() => { if (q) setMeta({ date: q.date, valid_until: q.valid_until ?? '', kind: q.kind, notes: q.notes }) }, [q])

  const save = useSave(resources.quotes, { related: ['repair-orders'] })
  const revise = useAction(resources.quotes, 'revise', { success: 'Nouvelle version créée', onSuccess: (n) => navigate(`/devis/${n.id}`) })
  const toInvoice = useAction(resources.quotes, 'to-invoice', { related: ['invoices', 'repair-orders'], success: 'Facture créée', onSuccess: (inv) => navigate(`/factures/${inv.id}`) })

  if (isLoading || !q) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>

  const setStatus = async (status) => {
    if (status === 'accepted' && !(await confirm({ title: 'Valider ce devis ?', description: 'Un devis accepté est verrouillé : toute modification ultérieure créera une nouvelle version.', confirmLabel: 'Accepter le devis' }))) return
    if (['refused', 'cancelled'].includes(status) && !(await confirm({ title: status === 'refused' ? 'Marquer comme refusé ?' : 'Annuler ce devis ?', variant: 'destructive' }))) return
    save.mutate({ id: q.id, status })
  }
  const saveMeta = () => save.mutate({ id: q.id, ...meta, valid_until: meta.valid_until || null })

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Devis', to: '/devis' }, { label: q.repair_order_number, to: `/dossiers/${q.repair_order}` }, { label: `${q.number} v${q.version}` }]}
        title={<span className="font-mono">{q.number} <span className="text-muted-foreground">v{q.version}</span></span>}
        actions={
          <>
            <Button icon={Printer} onClick={() => window.open(`/imprimer/devis/${q.id}`, '_blank')}>Imprimer / PDF</Button>
            {!q.is_locked && q.status === 'draft' && <Button icon={Send} onClick={() => setStatus('sent')}>Marquer envoyé</Button>}
            {!q.is_locked && <Button variant="primary" icon={Check} onClick={() => setStatus('accepted')}>Accepter</Button>}
            {q.is_locked && <Button icon={CopyPlus} loading={revise.isPending} onClick={() => revise.mutate({ id: q.id })}>Nouvelle version</Button>}
            {q.status === 'accepted' && <Button variant="primary" icon={Receipt} loading={toInvoice.isPending} onClick={() => toInvoice.mutate({ id: q.id })}>Créer la facture</Button>}
          </>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge list={QUOTE_STATUSES} value={q.status} />
          <Badge tone={q.kind === 'insurance' ? 'violet' : 'neutral'}>{q.kind_label}</Badge>
          <Link to={`/clients/${q.client_id}`} className="hover:text-foreground">{q.client_name}</Link>·<span>{q.vehicle_label}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6"><DocumentEditor doc={q} resource={resources.quotes} related={['repair-orders']} /></div>
        <div className="grid h-fit gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <Card className="space-y-4 p-4">
            <Field label="Type de devis"><Select disabled={q.is_locked} value={meta.kind ?? ''} options={QUOTE_KINDS} onChange={(e) => setMeta({ ...meta, kind: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><Input type="date" disabled={q.is_locked} value={meta.date ?? ''} onChange={(e) => setMeta({ ...meta, date: e.target.value })} /></Field>
              <Field label="Valable jusqu’au"><Input type="date" disabled={q.is_locked} value={meta.valid_until ?? ''} onChange={(e) => setMeta({ ...meta, valid_until: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea disabled={q.is_locked} value={meta.notes ?? ''} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} /></Field>
            {!q.is_locked && <Button className="w-full" onClick={saveMeta} loading={save.isPending}>Enregistrer les informations</Button>}
            {!q.is_locked && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="flex-1" icon={X} onClick={() => setStatus('refused')}>Refusé</Button>
                <Button size="sm" variant="ghost" className="flex-1" icon={Ban} onClick={() => setStatus('cancelled')}>Annuler</Button>
              </div>
            )}
          </Card>
          <Card className="p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="size-4 text-muted-foreground" />Versions</p>
            <ol className="space-y-1">
              {q.versions.map((v) => (
                <li key={v.id}>
                  <Link to={`/devis/${v.id}`} className={cn('flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-muted', v.id === q.id && 'bg-muted font-medium')}>
                    <span>v{v.version} · {formatDate(v.date, { day: '2-digit', month: 'short' })}</span>
                    <span className="flex items-center gap-2"><span className="text-xs tabular">{formatMoney(v.total_ttc_cache, { currency: false })}</span><StatusBadge list={QUOTE_STATUSES} value={v.status} dot={false} /></span>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Les versions précédentes sont conservées avec leurs prix et opérations.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
