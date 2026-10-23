import { Truck } from 'lucide-react'

import { CrudPage } from '@/components/common/crud-page'
import { Avatar } from '@/components/ui/avatar'
import { resources } from '@/lib/api'

const fields = [
  { name: 'name', label: 'Raison sociale', required: true },
  { name: 'contact_name', label: 'Contact', span: 1 },
  { name: 'phone', label: 'Téléphone', type: 'tel', span: 1 },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'address', label: 'Adresse' },
  { name: 'city', label: 'Ville', span: 1 },
  { name: 'ice', label: 'ICE', span: 1 },
  { name: 'delivery_days', label: 'Délai de livraison habituel', type: 'number', suffix: 'jours', span: 1 },
  { name: 'notes', label: 'Notes (conditions, réclamations…)', type: 'textarea' },
]

const columns = [
  { key: 'name', header: 'Fournisseur', mobile: 'title', render: (s) => <div className="flex items-center gap-3"><Avatar name={s.name} /><div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.city}</p></div></div> },
  { key: 'contact', header: 'Contact', mobile: 'subtitle', render: (s) => <div><p>{s.contact_name || '—'}</p><p className="text-xs text-muted-foreground tabular">{s.phone}</p></div> },
  { key: 'email', header: 'E-mail', render: (s) => <span className="text-muted-foreground">{s.email || '—'}</span> },
  { key: 'delay', header: 'Délai', align: 'right', render: (s) => <span className="tabular">{s.delivery_days} j</span> },
  { key: 'parts', header: 'Pièces au catalogue', align: 'right', render: (s) => <span className="tabular">{s.parts_count}</span> },
]

export default function Suppliers() {
  return (
    <CrudPage title="Fournisseurs" description="Coordonnées, délais habituels et catalogue des pièces fournies." resource={resources.suppliers}
      columns={columns} fields={fields} defaults={{ delivery_days: 2, city: 'Casablanca' }} newLabel="Nouveau fournisseur"
      panelTitle={(s) => s.name} panelIcon={Truck} emptyIcon={Truck} searchPlaceholder="Nom, contact, téléphone, ville…" />
  )
}
