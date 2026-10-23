import { resources } from '@/lib/api'
import { CHEQUE_STATUSES, PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_ORIGINS } from '@/lib/choices'
import { formatMoney, today } from '@/lib/utils'

export const paymentFields = [
  { section: 'Affectation' },
  { name: 'client', label: 'Client', type: 'resource', resource: resources.clients, required: true,
    getLabel: (c) => c.display_name, getSubLabel: (c) => `${c.code} · ${c.phone}` },
  { name: 'repair_order', label: 'Dossier', type: 'resource', resource: resources.repairOrders, span: 1,
    params: (v) => (v.client ? { client: v.client } : {}), getLabel: (r) => r.number, getSubLabel: (r) => r.vehicle_label },
  { name: 'invoice', label: 'Facture', type: 'resource', resource: resources.invoices, span: 1,
    params: (v) => ({ unpaid: 1, ...(v.repair_order ? { repair_order: v.repair_order } : v.client ? { repair_order__client: v.client } : {}) }),
    getLabel: (i) => i.number, getSubLabel: (i) => `Reste ${formatMoney(i.balance)}`,
    onPick: (i) => (i ? { repair_order: i.repair_order } : {}) },
  { section: 'Opération' },
  { name: 'kind', label: "Type d'opération", type: 'select', options: PAYMENT_KINDS, span: 1, required: true },
  { name: 'origin', label: 'Origine', type: 'select', options: PAYMENT_ORIGINS, span: 1, required: true },
  { name: 'amount', label: 'Montant', type: 'money', span: 1, required: true },
  { name: 'date', label: 'Date', type: 'date', span: 1, required: true },
  { name: 'method', label: 'Mode de paiement', type: 'select', options: PAYMENT_METHODS, required: true },
  { name: 'reference', label: 'Référence transaction / n° chèque', span: 1 },
  { name: 'bank', label: 'Banque', span: 1, show: (v) => ['cheque', 'transfer', 'card'].includes(v.method) },
  { name: 'cheque_due_date', label: 'Échéance du chèque', type: 'date', span: 1, show: (v) => v.method === 'cheque' },
  { name: 'cheque_status', label: 'Statut du chèque', type: 'select', options: CHEQUE_STATUSES, span: 1, show: (v) => v.method === 'cheque',
    hint: 'Un chèque non encaissé n’est pas compté comme reçu.' },
  { name: 'reason', label: 'Motif', required: true, show: (v) => v.kind === 'refund', hint: 'Obligatoire pour un remboursement.' },
  { name: 'comment', label: 'Commentaire', type: 'textarea' },
  { name: 'receipt', label: 'Justificatif', type: 'file', accept: 'image/*,application/pdf' },
]

export const paymentDefaults = () => ({ kind: 'payment', origin: 'client', method: 'cash', date: today() })
