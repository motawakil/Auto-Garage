import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Car, CheckCircle2, ScanSearch } from 'lucide-react'
import { useState } from 'react'

import { DataTable } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { ResourceSelect } from '@/components/common/resource-select'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/input'
import { api, resources } from '@/lib/api'
import { PART_CATEGORIES } from '@/lib/choices'
import { partColumns } from '@/features/stock/stock'

export default function Compatibility() {
  const [crit, setCrit] = useState({ brand: '', model: '', year: '', engine: '', category: '' })
  const [vehicleId, setVehicleId] = useState(null)
  const { data: brands = [] } = useQuery({ queryKey: ['parts', 'brands'], queryFn: () => api.get('/parts/brands/').then((r) => r.data) })
  const active = Object.fromEntries(Object.entries(crit).filter(([, v]) => v))
  const ready = !!crit.brand
  const { data: rows = [], isFetching } = useQuery({
    queryKey: ['parts', 'compatible', active],
    queryFn: () => api.get('/parts/compatible/', { params: active }).then((r) => r.data),
    enabled: ready,
  })
  const set = (k) => (e) => setCrit({ ...crit, [k]: e.target.value })
  const verified = rows.filter((r) => r.compatibility_verified).length

  return (
    <div className="space-y-6">
      <PageHeader title="Compatibilité" description="Choisissez un véhicule : le système propose les pièces compatibles disponibles dans le catalogue." />

      <Card className="p-5">
        <div className="mb-5 max-w-md">
          <Field label="Partir d’un véhicule client" hint="Pré-remplit la marque, le modèle, l’année et la motorisation.">
            <ResourceSelect resource={resources.vehicles} value={vehicleId} getLabel={(v) => `${v.plate} · ${v.brand} ${v.model}`} getSubLabel={(v) => v.client_name}
              onChange={(id, v) => { setVehicleId(id); if (v) setCrit({ ...crit, brand: v.brand, model: v.model.split(' ')[0], year: v.year ?? '', engine: (v.engine || '').split(' ').slice(0, 2).join(' ') }) }} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Marque" required><Select value={crit.brand} onChange={set('brand')} placeholder="Choisir…" options={brands.map((b) => ({ value: b, label: b }))} /></Field>
          <Field label="Modèle"><Input value={crit.model} onChange={set('model')} placeholder="Clio, 208…" /></Field>
          <Field label="Année"><Input type="number" value={crit.year} onChange={set('year')} placeholder="2018" /></Field>
          <Field label="Motorisation"><Input value={crit.engine} onChange={set('engine')} placeholder="1.5 dCi" /></Field>
          <Field label="Catégorie"><Select value={crit.category} onChange={set('category')} placeholder="Toutes" options={PART_CATEGORIES} /></Field>
        </div>
      </Card>

      {ready && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1"><Car className="size-4" />{rows.length} pièce(s) trouvée(s)</span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="size-4" />{verified} vérifiée(s)</span>
          {rows.length - verified > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"><AlertTriangle className="size-4" />{rows.length - verified} à confirmer</span>
          )}
        </div>
      )}

      <Card className="overflow-hidden">
        {!ready ? (
          <EmptyState icon={ScanSearch} title="Sélectionnez au moins une marque" description="Les références non vérifiées sont signalées : aucune référence OEM n’est inventée." />
        ) : (
          <DataTable columns={partColumns} rows={rows} loading={isFetching}
            empty={<EmptyState icon={ScanSearch} title="Aucune pièce compatible dans le catalogue" description="Référence inconnue : à commander auprès d’un fournisseur après vérification." />} />
        )}
      </Card>
    </div>
  )
}
