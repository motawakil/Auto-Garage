import { Receipt } from 'lucide-react'

import { CrudPage } from '@/components/common/crud-page'
import { resources } from '@/lib/api'
import { INVOICE_STATUSES } from '@/lib/choices'
import { invoiceColumns } from '@/features/quotes/quote-columns'

export default function Invoices() {
  return (
    <CrudPage
      title="Factures"
      description="Factures créées depuis les devis validés — répartition assurance / client et suivi des soldes."
      resource={resources.invoices}
      columns={invoiceColumns()}
      emptyIcon={Receipt}
      rowLink={(i) => `/factures/${i.id}`}
      searchPlaceholder="N° facture, dossier, client, immatriculation…"
      filters={[
        { name: 'unpaid', label: '', segmented: true, default: '', options: [{ value: '', label: 'Toutes' }, { value: '1', label: 'À encaisser' }] },
        { name: 'status', label: 'Tous les statuts', options: INVOICE_STATUSES },
      ]}
      exportName="factures"
    />
  )
}
