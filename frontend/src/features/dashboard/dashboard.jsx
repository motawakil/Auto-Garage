import {
  AlertTriangle, ArrowRight, Banknote, Boxes, Car, CheckCircle2, ClipboardCheck, FileClock, Hourglass, Landmark,
  Plus, Receipt, Users, Wallet, Wrench,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { StatusBadge } from '@/components/common/status-badge'
import { useNotificationsCount } from '@/components/layout/sidebar'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { REPAIR_STATUSES, toneOf } from '@/lib/choices'
import { cn, formatDate, formatMoney, formatRelative } from '@/lib/utils'
import { dots } from '@/components/ui/badge'
import { RevenueChart } from './revenue-chart'
import { useDashboard } from './use-dashboard'

const PRIORITY = { high: 'bg-red-500', normal: 'bg-amber-500', low: 'bg-emerald-500' }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

export default function Dashboard() {
  const { data, isLoading } = useDashboard()
  const { data: notifs = [] } = useNotificationsCount()
  const { user } = useAuth()
  const navigate = useNavigate()
  const c = data?.counts ?? {}
  const f = data?.finance ?? {}
  const maxPipeline = Math.max(1, ...(data?.pipeline ?? []).map((p) => p.count))

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${user?.first_name ? `, ${user.first_name}` : ''}`}
        description={new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
        actions={
          <>
            <Button icon={Wallet} onClick={() => navigate('/paiements?new=1')}>Encaisser</Button>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/dossiers?new=1')}>Accueillir un véhicule</Button>
          </>
        }
      />

      {/* Hero finance band */}
      <div className="relative overflow-hidden rounded-3xl bg-sidebar p-6 text-white shadow-pop md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-96 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Encaissé ce mois', value: f.month_collected, icon: Banknote, hint: 'Argent réellement reçu' },
            { label: 'Facturé ce mois', value: f.month_invoiced, icon: Receipt, hint: 'Chiffre d’affaires TTC' },
            { label: 'Reste à encaisser', value: f.unpaid_amount, icon: Hourglass, hint: `${f.unpaid_count ?? 0} facture(s) ouverte(s)` },
            { label: 'Chèques en attente', value: f.pending_cheques_amount, icon: Landmark, hint: `${f.pending_cheques_count ?? 0} chèque(s) non encaissé(s)` },
          ].map((k, i) => (
            <div key={k.label} className={cn('min-w-0', i > 0 && 'xl:border-l xl:border-white/10 xl:pl-6')}>
              <p className="flex items-center gap-2 text-[13px] text-white/60"><k.icon className="size-4 text-red-400" />{k.label}</p>
              {isLoading ? <Skeleton className="mt-2 h-8 w-32 bg-white/10" /> : (
                <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight tabular">
                  {formatMoney(k.value, { currency: false })}<span className="ml-1.5 text-sm font-medium text-white/50">MAD</span>
                </p>
              )}
              <p className="mt-2 text-xs text-white/45">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Clients" value={c.clients} icon={Users} to="/clients" loading={isLoading} hint={`${c.vehicles ?? '…'} véhicules`} />
        <StatCard label="Dossiers en cours" value={c.active_repairs} icon={Wrench} accent="red" to="/dossiers" loading={isLoading} hint={`${c.done_repairs ?? '…'} terminés`} />
        <StatCard label="Attente expertise" value={c.waiting_expertise} icon={ClipboardCheck} accent="amber" to="/dossiers" loading={isLoading} />
        <StatCard label="Devis à valider" value={c.quotes_pending} icon={FileClock} accent="violet" to="/devis" loading={isLoading} />
        <StatCard label="Prêts à livrer" value={c.ready_to_deliver} icon={Car} accent="green" to="/dossiers" loading={isLoading} />
        <StatCard label="Alertes stock" value={c.low_stock} icon={Boxes} accent={c.low_stock ? 'red' : 'neutral'} to="/stock" loading={isLoading} hint={`${c.late_tasks ?? 0} tâche(s) en retard`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Facturé vs encaissé" description="Six derniers mois — l’encaissé exclut les chèques non encaissés" />
          <CardBody>{isLoading ? <Skeleton className="h-64 w-full" /> : <RevenueChart data={data.revenue} />}</CardBody>
        </Card>

        <Card>
          <CardHeader title="Atelier en temps réel" description="Dossiers actifs par étape" action={<Link to="/dossiers" className="text-xs font-medium text-primary hover:underline">Voir</Link>} />
          <CardBody className="space-y-2.5">
            {(data?.pipeline ?? []).map((p) => (
              <Link to={`/dossiers?status=${p.status}`} key={p.status} className="group block">
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                    <span className={cn('size-1.5 rounded-full', dots[toneOf(REPAIR_STATUSES, p.status)])} />{p.label}
                  </span>
                  <span className="font-medium tabular">{p.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground/80 transition-all group-hover:bg-primary" style={{ width: `${(p.count / maxPipeline) * 100}%` }} />
                </div>
              </Link>
            ))}
            {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader title="Derniers dossiers traités" action={<Button size="sm" variant="ghost" onClick={() => navigate('/dossiers')}>Tout voir <ArrowRight className="size-3.5" /></Button>} />
          <div className="divide-y divide-border border-t border-border">
            {(data?.recent ?? []).map((r) => (
              <Link key={r.id} to={`/dossiers/${r.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Car className="size-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.vehicle}</p>
                  <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{r.number}</span> · {r.client}</p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <p>Livraison</p><p className="font-medium text-foreground">{formatDate(r.expected_delivery_date, { day: '2-digit', month: 'short' })}</p>
                </div>
                <StatusBadge list={REPAIR_STATUSES} value={r.status} />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="À traiter" description={`${notifs.length} alerte(s) active(s)`} icon={AlertTriangle}
            action={<Link to="/notifications" className="text-xs font-medium text-primary hover:underline">Tout voir</Link>} />
          <div className="divide-y divide-border border-t border-border">
            {notifs.slice(0, 6).map((n) => (
              <Link key={n.id} to={n.link} className="flex gap-3 px-5 py-3 hover:bg-muted/50">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PRIORITY[n.priority])} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                </span>
              </Link>
            ))}
            {notifs.length === 0 && (
              <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-500" />Rien à signaler</div>
            )}
          </div>
          <div className="border-t border-border px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activité récente</p>
            <ol className="relative space-y-3 border-l border-border pl-4">
              {(data?.activity ?? []).slice(0, 5).map((a) => (
                <li key={a.id} className="relative text-[13px]">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full border-2 border-card bg-primary" />
                  <p className="leading-snug">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(a.date)}</p>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>
    </div>
  )
}
