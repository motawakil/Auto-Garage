import { Car, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CrudPage } from '@/components/common/crud-page'
import { FormPanel } from '@/components/common/form-panel'
import { Money } from '@/components/common/money'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { resources } from '@/lib/api'
import { CLIENT_KINDS } from '@/lib/choices'
import { clientDefaults, clientFields } from './client-fields'
import { DuplicateHint } from './duplicate-hint'

const columns = [
  {
    key: 'name', header: 'Client', sortKey: 'last_name', mobile: 'title',
    render: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={c.display_name} />
        <div className="min-w-0">
          <p className="truncate font-medium">{c.display_name}</p>
          <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{c.code}</span>{c.city && ` · ${c.city}`}</p>
        </div>
      </div>
    ),
  },
  { key: 'phone', header: 'Téléphone', mobile: 'subtitle', render: (c) => <span className="tabular">{c.phone}</span> },
  { key: 'kind', header: 'Type', render: (c) => <Badge tone={c.kind === 'company' ? 'blue' : 'neutral'}>{CLIENT_KINDS.find((k) => k.value === c.kind)?.label}</Badge> },
  {
    key: 'vehicles', header: 'Véhicules',
    render: (c) => (
      <div className="flex flex-wrap gap-1">
        {c.plates.length === 0 && <span className="text-muted-foreground">—</span>}
        {c.plates.map((p) => <span key={p} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]"><Car className="size-3" />{p}</span>)}
      </div>
    ),
  },
  { key: 'repairs', header: 'Réparations', align: 'right', render: (c) => <span className="tabular">{c.repairs_count}{c.active_repairs_count > 0 && <Badge tone="red" className="ml-2">{c.active_repairs_count} en cours</Badge>}</span> },
  { key: 'invoiced', header: 'Facturé', align: 'right', sortKey: 'invoiced_total', render: (c) => <Money value={c.invoiced_total} muted className="font-medium" /> },
]

export default function Clients() {
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    if (params.get('new')) { setCreating(true); setParams({}, { replace: true }) }
  }, [params, setParams])

  return (
    <>
      <CrudPage
        title="Clients"
        description="Dossiers permanents : coordonnées, véhicules, réparations et situation financière."
        resource={resources.clients}
        columns={columns}
        fields={clientFields}
        defaults={clientDefaults}
        newLabel="Nouveau client"
        panelIcon={Users}
        emptyIcon={Users}
        rowLink={(c) => `/clients/${c.id}`}
        searchPlaceholder="Nom, téléphone, CIN, immatriculation, n° dossier…"
        filters={[{ name: 'kind', label: 'Tous les types', options: CLIENT_KINDS }]}
        exportName="clients"
        panelExtra={(v) => <DuplicateHint values={v} />}
      />
      <FormPanel open={creating} onClose={() => setCreating(false)} resource={resources.clients} fields={clientFields}
        defaults={clientDefaults} title="Nouveau client" icon={Users} extra={(v) => <DuplicateHint values={v} />}
        onSaved={(c) => navigate(`/clients/${c.id}`)} />
    </>
  )
}
