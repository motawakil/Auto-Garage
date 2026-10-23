import { CLIENT_KINDS } from '@/lib/choices'

export const clientFields = [
  { section: 'Identité' },
  { name: 'kind', label: 'Type de client', type: 'select', options: CLIENT_KINDS, required: true },
  { name: 'company_name', label: 'Raison sociale', show: (v) => v.kind === 'company', required: true },
  { name: 'first_name', label: 'Prénom', span: 1 },
  { name: 'last_name', label: 'Nom', span: 1, required: true },
  { name: 'cin', label: 'CIN', span: 1, transform: (v) => v.toUpperCase() },
  { name: 'ice', label: 'ICE', span: 1, show: (v) => v.kind === 'company' },
  { section: 'Coordonnées' },
  { name: 'phone', label: 'Téléphone', type: 'tel', span: 1, required: true, placeholder: '06 00 00 00 00' },
  { name: 'phone_secondary', label: 'Téléphone 2', type: 'tel', span: 1 },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'address', label: 'Adresse' },
  { name: 'city', label: 'Ville', span: 1 },
  { section: 'Notes' },
  { name: 'notes', label: 'Notes internes', type: 'textarea' },
]

export const clientDefaults = { kind: 'individual', city: 'Casablanca' }
