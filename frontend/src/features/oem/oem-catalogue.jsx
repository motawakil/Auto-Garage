import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, Car, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { CrudPage } from '@/components/common/crud-page'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, resources, showApiError } from '@/lib/api'
import { OEM_STATUSES } from '@/lib/choices'
import { cn } from '@/lib/utils'
import { oemColumns } from './oem-columns'
import { OemEquivalenceList } from './oem-equivalence-list'
import { oemDefaults, oemFields } from './oem-fields'

const SEGMENTS = [
  { key: 'confirmed', label: 'Confirmées', className: 'bg-emerald-500' },
  { key: 'to_verify', label: 'À vérifier', className: 'bg-amber-500' },
  { key: 'unknown', label: 'Inconnues', className: 'bg-zinc-300 dark:bg-zinc-600' },
]

function Progress({ counts, total, className }) {
  return (
    <div className={cn('flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted', className)}>
      {SEGMENTS.map((s) => counts[s.key] > 0 && <span key={s.key} className={s.className} style={{ width: `${(counts[s.key] / total) * 100}%` }} />)}
    </div>
  )
}

function ImportButton() {
  const input = useRef(null)
  const [loading, setLoading] = useState(false)
  const qc = useQueryClient()
  const upload = async (file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setLoading(true)
    try {
      const { data } = await api.post('/oem-references/import/', fd)
      toast.success(`Import terminé : ${data.created} créée(s), ${data.updated} mise(s) à jour, ${data.skipped} inchangée(s)`)
      data.errors.slice(0, 3).forEach((e) => toast.warning(e))
      qc.invalidateQueries({ queryKey: ['oem-references'] })
    } catch (e) { showApiError(e) } finally {
      setLoading(false)
      input.current.value = ''
    }
  }
  return (
    <>
      <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <Button icon={Upload} loading={loading} onClick={() => input.current.click()}>Importer un fichier Excel</Button>
    </>
  )
}

/** Vehicle OEM catalogue imported from Base_OEM_*.xlsx, with completion progress per family. */
export function OemCatalogue() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['oem-references', 'stats'], queryFn: () => api.get('/oem-references/stats/').then((r) => r.data) })
  const total = Math.max(1, stats?.total ?? 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold"><BookOpenCheck className="size-4 text-primary" />Avancement de la vérification</p>
              <p className="mt-1 text-xs text-muted-foreground">Une référence n’est utilisable qu’une fois confirmée par une source constructeur.</p>
            </div>
            <ImportButton />
          </div>
          {isLoading ? <Skeleton className="mt-5 h-16" /> : (
            <>
              <p className="mt-4 text-3xl font-semibold tracking-tight tabular">{stats.by_status.confirmed}<span className="text-base font-medium text-muted-foreground"> / {stats.total} confirmées</span></p>
              <Progress counts={stats.by_status} total={total} className="mt-3 h-2.5" />
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                {SEGMENTS.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className={cn('size-2 rounded-full', s.className)} />{s.label} <span className="font-semibold tabular">{stats.by_status[s.key]}</span></span>)}
                <span className="text-muted-foreground">{stats.equivalences} équivalence(s)</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {stats.vehicles.map((v) => (
                  <span key={`${v.brand}${v.model}${v.year}${v.engine}`} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
                    <Car className="size-3.5" />{v.brand} {v.model} {v.year} · {v.engine}<span className="text-muted-foreground">({v.c})</span>
                  </span>
                ))}
                {stats.vehicles.length === 0 && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5" />Importez un fichier Base_OEM pour démarrer.</span>}
              </div>
            </>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold">Par famille</p>
          <div className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {(stats?.families ?? []).map((f) => (
              <div key={f.family}>
                <div className="mb-1 flex justify-between text-xs"><span className="truncate">{f.family}</span><span className="text-muted-foreground tabular">{f.confirmed}/{f.total}</span></div>
                <Progress counts={f} total={f.total} />
              </div>
            ))}
            {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
          </div>
        </Card>
      </div>

      <CrudPage
        embedded
        resource={resources.oemReferences}
        columns={oemColumns({ withVehicle: (stats?.vehicles.length ?? 0) > 1 })}
        fields={oemFields}
        defaults={oemDefaults}
        newLabel="Nouvelle ligne OEM"
        panelTitle={(o) => o.designation}
        panelIcon={BookOpenCheck}
        emptyIcon={BookOpenCheck}
        related={['oem-references']}
        searchPlaceholder="Désignation, référence OEM, supersession, équivalence…"
        filters={[
          { name: 'status', label: 'Tous les statuts', options: OEM_STATUSES },
          { name: 'family', label: 'Toutes les familles', options: (stats?.families ?? []).map((f) => ({ value: f.family, label: f.family })) },
        ]}
        panelExtra={(v) => <OemEquivalenceList oemId={v.id} />}
      />
    </div>
  )
}
