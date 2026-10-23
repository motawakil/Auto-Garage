import { resources } from '@/lib/api'
import { MOVEMENT_KINDS } from '@/lib/choices'
import { formatMoney, today } from '@/lib/utils'

export const movementFields = ({ withRepair = true } = {}) => [
  { name: 'part', label: 'Pièce', type: 'resource', resource: resources.parts, required: true,
    getLabel: (p) => `${p.reference} · ${p.designation}`, getSubLabel: (p) => `${p.quantity} en stock · ${formatMoney(p.purchase_price)}` },
  { name: 'kind', label: 'Mouvement', type: 'select', options: MOVEMENT_KINDS, span: 1, required: true },
  { name: 'quantity', label: 'Quantité', type: 'number', span: 1, required: true, hint: 'Ajustement : valeur négative pour retirer.' },
  { name: 'date', label: 'Date', type: 'date', span: 1, required: true },
  { name: 'unit_cost', label: 'Coût unitaire', type: 'money', span: 1, hint: 'Par défaut : prix d’achat.' },
  ...(withRepair ? [{ name: 'repair_order', label: 'Dossier', type: 'resource', resource: resources.repairOrders,
    show: (v) => ['out', 'unused_return'].includes(v.kind), getLabel: (r) => r.number, getSubLabel: (r) => r.vehicle_label }] : []),
  { name: 'supplier', label: 'Fournisseur', type: 'resource', resource: resources.suppliers, show: (v) => ['in', 'supplier_return'].includes(v.kind), getLabel: (s) => s.name },
  { name: 'reason', label: 'Motif / commentaire', required: false },
]

export const movementDefaults = () => ({ kind: 'in', quantity: 1, date: today() })
