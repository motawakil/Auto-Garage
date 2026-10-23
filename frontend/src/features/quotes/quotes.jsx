import { FileCheck2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { CrudPage } from '@/components/common/crud-page'
import { resources } from '@/lib/api'
import { QUOTE_KINDS, QUOTE_STATUSES } from '@/lib/choices'
import { quoteColumns } from './quote-columns'

const fields = [
  { name: 'repair_order', label: 'Dossier de réparation', type: 'resource', resource: resources.repairOrders, required: true,
    getLabel: (r) => `${r.number} · ${r.client_name}`, getSubLabel: (r) => r.vehicle_label },
  { name: 'kind', label: 'Type de devis', type: 'select', options: QUOTE_KINDS, required: true },
]

export default function Quotes() {
  const navigate = useNavigate()
  return (
    <CrudPage
      title="Devis & expertises"
      description="Devis estimatifs et devis approuvés par l’assurance, avec historique des versions."
      resource={resources.quotes}
      params={{ latest: 1 }}
      columns={quoteColumns()}
      fields={fields}
      defaults={{ kind: 'estimate' }}
      newLabel="Nouveau devis"
      panelIcon={FileCheck2}
      emptyIcon={FileCheck2}
      rowLink={(q) => `/devis/${q.id}`}
      searchPlaceholder="N° devis, dossier, client, immatriculation…"
      filters={[
        { name: 'status', label: 'Tous les statuts', options: QUOTE_STATUSES },
        { name: 'kind', label: 'Tous les types', options: QUOTE_KINDS },
      ]}
      related={['repair-orders']}
      onSaved={(q) => navigate(`/devis/${q.id}`)}
    />
  )
}
