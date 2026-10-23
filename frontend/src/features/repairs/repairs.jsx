import { useQuery } from '@tanstack/react-query'
import { Columns3, List, Plus, Search, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { DataTable, Pagination } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { FormPanel } from '@/components/common/form-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Segmented } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/use-debounce'
import { useList } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { REPAIR_TYPES } from '@/lib/choices'
import { cn } from '@/lib/utils'
import { repairColumns } from './repair-columns'
import { RepairKanban } from './repair-kanban'
import { repairDefaults, repairFields } from './repair-fields'

const GROUPS = [
  { value: 'active', label: 'En cours' },
  { value: 'insurance', label: 'Assurance' },
  { value: '', label: 'Tous' },
]

function readView() {
  try { return localStorage.getItem('gej-repairs-view') || 'list' } catch { return 'list' }
}

export default function Repairs() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState(readView)
  const [group, setGroup] = useState('active')
  const [status, setStatus] = useState(params.get('status') || '')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [ordering, setOrdering] = useState()
  const [creating, setCreating] = useState(null)
  const debounced = useDebounce(search)

  useEffect(() => {
    if (params.get('new')) {
      setCreating({ ...repairDefaults(), client: Number(params.get('client')) || null, vehicle: Number(params.get('vehicle')) || null })
      setParams({}, { replace: true })
    }
  }, [params, setParams])
  useEffect(() => { try { localStorage.setItem('gej-repairs-view', view) } catch { /* ignore */ } }, [view])

  const filters = { search: debounced, group: status ? '' : group, status, repair_type: type }
  const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  const { data, isLoading } = useList(resources.repairOrders, { page, ordering, ...clean }, { enabled: view === 'list' })
  const { data: statusCounts = [] } = useQuery({
    queryKey: ['repair-orders', 'statuses'],
    queryFn: () => resources.repairOrders.action(null, 'statuses', undefined, 'get'),
  })

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Dossiers de réparation"
          description="Suivi complet des interventions, de l’accueil du véhicule à la clôture."
          actions={
            <>
              <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'Liste', icon: List }, { value: 'board', label: 'Atelier', icon: Columns3 }]} />
              <Button variant="primary" icon={Plus} onClick={() => setCreating(repairDefaults())}>Nouveau dossier</Button>
            </>
          }
        />

        <div className="scrollbar-thin -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {statusCounts.filter((s) => s.count > 0).map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatus(status === s.value ? '' : s.value); setPage(1) }}
              className={cn('flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                status === s.value ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:border-input')}
            >
              {s.label}<span className={cn('tabular', status === s.value ? 'opacity-70' : 'text-muted-foreground')}>{s.count}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 sm:max-w-sm"><Input icon={Search} placeholder="N° dossier, client, immatriculation, sinistre…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {!status && <Segmented value={group} onChange={(g) => { setGroup(g); setPage(1) }} options={GROUPS} />}
            <div className="w-44"><Select value={type} onChange={(e) => setType(e.target.value)} options={REPAIR_TYPES} placeholder="Tous les types" /></div>
          </div>
        </div>

        {view === 'board' ? (
          <RepairKanban params={clean} />
        ) : (
          <Card className="overflow-hidden">
            <DataTable
              columns={repairColumns()}
              rows={data?.results}
              loading={isLoading}
              onRowClick={(r) => navigate(`/dossiers/${r.id}`)}
              ordering={ordering}
              onOrderingChange={setOrdering}
              empty={<EmptyState icon={Wrench} title="Aucun dossier" action={<Button variant="primary" icon={Plus} onClick={() => setCreating(repairDefaults())}>Nouveau dossier</Button>} />}
            />
            <Pagination page={page} count={data?.count} onChange={setPage} />
          </Card>
        )}
      </div>

      <FormPanel open={!!creating} onClose={() => setCreating(null)} resource={resources.repairOrders} fields={repairFields}
        defaults={creating ?? {}} title="Nouveau dossier" icon={Wrench} related={['clients', 'vehicles']}
        success="Dossier ouvert" onSaved={(r) => navigate(`/dossiers/${r.id}`)} />
    </div>
  )
}
