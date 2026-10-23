import { Car } from 'lucide-react'

import { CrudPage } from '@/components/common/crud-page'
import { resources } from '@/lib/api'
import { FUELS } from '@/lib/choices'
import { formatNumber } from '@/lib/utils'
import { vehicleFields } from './vehicle-fields'

export function Plate({ value }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white font-mono text-[12px] font-semibold text-zinc-900 shadow-sm dark:border-zinc-600">
      <span className="bg-red-600 px-1 py-0.5 text-[9px] text-white">MA</span>
      <span className="px-1.5 py-0.5 tracking-wide">{value}</span>
    </span>
  )
}

const columns = [
  { key: 'plate', header: 'Immatriculation', sortKey: 'plate', mobile: 'subtitle', render: (v) => <Plate value={v.plate} /> },
  {
    key: 'vehicle', header: 'Véhicule', sortKey: 'brand', mobile: 'title',
    render: (v) => (
      <div>
        <p className="font-medium">{v.brand} {v.model}</p>
        <p className="text-xs text-muted-foreground">{[v.year, v.engine, v.fuel_label].filter(Boolean).join(' · ')}</p>
      </div>
    ),
  },
  { key: 'client', header: 'Propriétaire', render: (v) => v.client_name },
  { key: 'vin', header: 'VIN', render: (v) => <span className="font-mono text-xs text-muted-foreground">{v.vin || '—'}</span> },
  { key: 'mileage', header: 'Kilométrage', align: 'right', render: (v) => (v.mileage ? <span className="tabular">{formatNumber(v.mileage)} km</span> : '—') },
  { key: 'repairs', header: 'Dossiers', align: 'right', render: (v) => <span className="tabular">{v.repairs_count}</span> },
]

export default function Vehicles() {
  return (
    <CrudPage
      title="Véhicules"
      description="Tous les véhicules rattachés aux clients et leur historique d’interventions."
      resource={resources.vehicles}
      columns={columns}
      fields={vehicleFields(true)}
      newLabel="Nouveau véhicule"
      panelIcon={Car}
      emptyIcon={Car}
      panelTitle={(v) => `${v.brand} ${v.model}`}
      related={['clients']}
      searchPlaceholder="Immatriculation, VIN, marque, client…"
      filters={[{ name: 'fuel', label: 'Tous carburants', options: FUELS }]}
      exportName="vehicles"
    />
  )
}
