import { FileText, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { FormPanel } from '@/components/common/form-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/context/confirm-dialog-provider'
import { useList, useRemove } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { DOCUMENT_KINDS, labelOf } from '@/lib/choices'
import { formatBytes, formatDate } from '@/lib/utils'

const baseFields = [
  { name: 'title', label: 'Titre', required: true },
  { name: 'kind', label: 'Type de document', type: 'select', options: DOCUMENT_KINDS, required: true },
  { name: 'file', label: 'Fichier', type: 'file', required: true, accept: 'image/*,application/pdf' },
  { name: 'notes', label: 'Notes' },
]

/** Photos, cartes grises, assurances… attached to a client / vehicle / dossier. */
export function DocumentsGallery({ params = {}, defaults = {}, withLinks = false }) {
  const [open, setOpen] = useState(false)
  const confirm = useConfirm()
  const { data, isLoading } = useList(resources.documents, { page_size: 100, ...params })
  const remove = useRemove(resources.documents)
  const rows = data?.results ?? []
  const fields = withLinks
    ? [...baseFields,
      { name: 'client', label: 'Client', type: 'resource', resource: resources.clients, getLabel: (c) => c.display_name },
      { name: 'repair_order', label: 'Dossier', type: 'resource', resource: resources.repairOrders, getLabel: (r) => r.number, getSubLabel: (r) => r.vehicle_label,
        params: (v) => (v.client ? { client: v.client } : {}) }]
    : baseFields

  const del = async (d) => {
    if (await confirm({ title: `Supprimer « ${d.title} » ?`, variant: 'destructive', confirmLabel: 'Supprimer' })) remove.mutate(d.id)
  }

  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{rows.length} document(s)</p>
          <Button variant="primary" size="sm" icon={Upload} onClick={() => setOpen(true)}>Ajouter un document</Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <Card><EmptyState icon={FileText} title="Aucun document" description="Photos avant/après, carte grise, constat, rapport d’expertise…" /></Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {rows.map((d) => (
              <Card key={d.id} className="group overflow-hidden">
                <a href={d.file_url} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] bg-muted">
                  {d.is_image ? <img src={d.file_url} alt={d.title} className="size-full object-cover" /> : (
                    <div className="flex size-full items-center justify-center"><FileText className="size-10 text-muted-foreground" /></div>
                  )}
                  <Badge className="absolute left-2 top-2 bg-card/90 backdrop-blur">{labelOf(DOCUMENT_KINDS, d.kind)}</Badge>
                </a>
                <div className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[d.repair_order_number, formatDate(d.created_at, { day: '2-digit', month: 'short' }), formatBytes(d.size)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button onClick={() => del(d)} className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-red-600 group-hover:opacity-100 cursor-pointer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <FormPanel open={open} onClose={() => setOpen(false)} resource={resources.documents} fields={fields}
        defaults={{ kind: 'photo_before', ...defaults }} fixed={withLinks ? undefined : defaults} title="Ajouter un document" icon={Upload} success="Document ajouté" />
    </div>
  )
}
