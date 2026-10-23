import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { CHEQUE_STATUSES, PAYMENT_KINDS } from '@/lib/choices'
import { cn, formatDate, formatMoney } from '@/lib/utils'

export function PaymentStatus({ p }) {
  if (p.is_cancelled) return <Badge tone="neutral">Annulé</Badge>
  if (p.method === 'cheque') return <StatusBadge list={CHEQUE_STATUSES} value={p.cheque_status} />
  return <Badge tone="green" dot>Reçu</Badge>
}

export const paymentColumns = ({ withClient = true } = {}) => [
  { key: 'date', header: 'Date', sortKey: 'date', render: (p) => <span className="text-muted-foreground">{formatDate(p.date)}</span> },
  {
    key: 'amount', header: 'Montant', sortKey: 'amount', mobile: 'title',
    render: (p) => (
      <span className={cn('inline-flex items-center gap-1.5 font-semibold tabular', p.kind === 'refund' && 'text-red-600', p.is_cancelled && 'line-through opacity-50')}>
        {p.kind === 'refund' ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5 text-emerald-600" />}
        {p.kind === 'refund' ? '−' : ''}{formatMoney(p.amount)}
      </span>
    ),
  },
  ...(withClient ? [{ key: 'client', header: 'Client', mobile: 'subtitle', render: (p) => p.client_name }] : []),
  { key: 'ro', header: 'Dossier / facture', render: (p) => <span className="font-mono text-xs">{[p.repair_order_number, p.invoice_number].filter(Boolean).join(' · ') || '—'}</span> },
  { key: 'kind', header: 'Opération', render: (p) => <StatusBadge list={PAYMENT_KINDS} value={p.kind} dot={false} /> },
  { key: 'method', header: 'Mode', render: (p) => <span>{p.method_label}{p.origin === 'insurance' && <Badge tone="violet" className="ml-2">Assurance</Badge>}</span> },
  { key: 'reference', header: 'Référence', render: (p) => <span className="text-xs text-muted-foreground">{[p.reference, p.bank].filter(Boolean).join(' · ') || '—'}</span> },
  { key: 'status', header: 'Statut', render: (p) => <PaymentStatus p={p} /> },
]
