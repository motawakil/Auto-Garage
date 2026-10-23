import { Money } from '@/components/common/money'
import { StatusBadge } from '@/components/common/status-badge'
import { Badge } from '@/components/ui/badge'
import { INVOICE_STATUSES, QUOTE_STATUSES } from '@/lib/choices'
import { formatDate } from '@/lib/utils'

export const quoteColumns = ({ withClient = true } = {}) => [
  {
    key: 'number', header: 'Devis', sortKey: 'number', mobile: 'title',
    render: (q) => <span className="font-mono text-[13px] font-semibold">{q.number}<span className="ml-1.5 rounded bg-muted px-1 text-[11px] text-muted-foreground">v{q.version}</span></span>,
  },
  { key: 'ro', header: 'Dossier', mobile: 'subtitle', render: (q) => <span><span className="font-mono text-xs">{q.repair_order_number}</span> <span className="text-muted-foreground">· {q.vehicle_label}</span></span> },
  ...(withClient ? [{ key: 'client', header: 'Client', render: (q) => q.client_name }] : []),
  { key: 'kind', header: 'Type', render: (q) => <Badge tone={q.kind === 'insurance' ? 'violet' : 'neutral'}>{q.kind === 'insurance' ? 'Assurance' : 'Estimatif'}</Badge> },
  { key: 'date', header: 'Date', sortKey: 'date', render: (q) => <span className="text-muted-foreground">{formatDate(q.date)}</span> },
  { key: 'status', header: 'Statut', render: (q) => <StatusBadge list={QUOTE_STATUSES} value={q.status} /> },
  { key: 'total', header: 'Net à payer', align: 'right', sortKey: 'total_ttc_cache', render: (q) => <Money value={q.totals.total_ttc} className="font-semibold" /> },
]

export const invoiceColumns = ({ withClient = true } = {}) => [
  { key: 'number', header: 'Facture', sortKey: 'number', mobile: 'title', render: (i) => <span className="font-mono text-[13px] font-semibold">{i.number}</span> },
  { key: 'ro', header: 'Dossier', mobile: 'subtitle', render: (i) => <span><span className="font-mono text-xs">{i.repair_order_number}</span> <span className="text-muted-foreground">· {i.vehicle_label}</span></span> },
  ...(withClient ? [{ key: 'client', header: 'Client', render: (i) => i.client_name }] : []),
  { key: 'date', header: 'Date', sortKey: 'date', render: (i) => <span className="text-muted-foreground">{formatDate(i.date)}</span> },
  { key: 'status', header: 'Statut', render: (i) => <StatusBadge list={INVOICE_STATUSES} value={i.status} /> },
  { key: 'total', header: 'Total TTC', align: 'right', sortKey: 'total_ttc_cache', render: (i) => <Money value={i.totals.total_ttc} className="font-semibold" /> },
  { key: 'balance', header: 'Reste dû', align: 'right', render: (i) => <Money value={i.balance} muted className={Number(i.balance) > 0 ? 'font-medium text-red-600' : ''} /> },
]
