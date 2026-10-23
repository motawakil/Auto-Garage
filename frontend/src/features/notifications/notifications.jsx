import { AlertTriangle, Bell, Boxes, CalendarClock, CheckCircle2, ClipboardCheck, FileClock, FileWarning, Landmark, PackageX, Receipt, ShieldCheck, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { useNotificationsCount } from '@/components/layout/sidebar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/tabs'
import { cn, formatDate } from '@/lib/utils'

const KINDS = {
  task_late: { icon: CalendarClock, label: 'Tâche en retard' }, repair_late: { icon: AlertTriangle, label: 'Livraison dépassée' },
  expertise: { icon: ClipboardCheck, label: 'Expertise' }, documents: { icon: FileWarning, label: 'Documents' },
  parts: { icon: PackageX, label: 'Pièces' }, ready: { icon: Truck, label: 'Prêt à livrer' }, quote: { icon: FileClock, label: 'Devis' },
  invoice: { icon: Receipt, label: 'Facture' }, cheque: { icon: Landmark, label: 'Chèque' }, insurance: { icon: ShieldCheck, label: 'Assurance' },
  stock: { icon: Boxes, label: 'Stock' },
}
const PRIO = { high: { tone: 'red', label: 'Prioritaire' }, normal: { tone: 'amber', label: 'Normale' }, low: { tone: 'green', label: 'Info' } }

export default function Notifications() {
  const { data = [], isLoading } = useNotificationsCount()
  const [filter, setFilter] = useState('all')
  const rows = filter === 'all' ? data : data.filter((n) => n.priority === filter)
  const count = (p) => data.filter((n) => n.priority === p).length

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Alertes calculées en continu : elles restent visibles tant que l’action attendue n’est pas réalisée."
        actions={<Segmented value={filter} onChange={setFilter} options={[
          { value: 'all', label: `Toutes · ${data.length}` }, { value: 'high', label: `Prioritaires · ${count('high')}` },
          { value: 'normal', label: `Normales · ${count('normal')}` }, { value: 'low', label: `Infos · ${count('low')}` },
        ]} />} />
      <Card className="overflow-hidden">
        {isLoading ? <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          : rows.length === 0 ? <EmptyState icon={CheckCircle2} title="Aucune alerte" description="Tout est à jour." />
          : (
            <ul className="divide-y divide-border">
              {rows.map((n) => {
                const K = KINDS[n.kind] ?? { icon: Bell, label: n.kind }
                return (
                  <li key={n.id}>
                    <Link to={n.link} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50">
                      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl',
                        n.priority === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : n.priority === 'normal' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10')}>
                        <K.icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{n.title}</p>
                        <p className="truncate text-sm text-muted-foreground">{n.detail}</p>
                      </div>
                      <div className="hidden flex-col items-end gap-1 sm:flex">
                        <Badge tone={PRIO[n.priority].tone} dot>{PRIO[n.priority].label}</Badge>
                        <span className="text-xs text-muted-foreground">{K.label}{n.date && ` · ${formatDate(n.date, { day: '2-digit', month: 'short' })}`}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
      </Card>
    </div>
  )
}
