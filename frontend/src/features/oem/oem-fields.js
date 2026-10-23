import { resources } from '@/lib/api'
import { CAR_BRANDS, OEM_EQUIVALENCE_KINDS, OEM_STATUSES } from '@/lib/choices'
import { formatMoney } from '@/lib/utils'

export const oemFields = [
  { section: 'Véhicule' },
  { name: 'brand', label: 'Marque', type: 'select', options: CAR_BRANDS.map((b) => ({ value: b, label: b })), span: 1, required: true },
  { name: 'model', label: 'Modèle', span: 1, required: true },
  { name: 'year', label: 'Année', type: 'number', span: 1 },
  { name: 'engine', label: 'Motorisation', span: 1 },
  { name: 'phase', label: 'Phase', hint: 'À confirmer par VIN / date de production.' },
  { section: 'Pièce' },
  { name: 'family', label: 'Famille', span: 1, required: true },
  { name: 'designation', label: 'Désignation', span: 1, required: true },
  { name: 'position', label: 'Côté / position', span: 1 },
  { name: 'variant', label: 'Variante / équipement', span: 1 },
  { section: 'Référence constructeur' },
  { name: 'oem_reference', label: 'Référence OEM', span: 1, transform: (v) => v.toUpperCase(),
    hint: 'Uniquement depuis une source traçable — jamais déduite du nom.' },
  { name: 'superseded_reference', label: 'Remplacée / supersession', span: 1, transform: (v) => v.toUpperCase() },
  { name: 'status', label: 'Statut de la référence', type: 'select', options: OEM_STATUSES, required: true },
  { name: 'source_url', label: 'Source / URL', placeholder: 'Catalogue constructeur, fournisseur…' },
  { name: 'verified_at', label: 'Date de vérification', type: 'date', span: 1 },
  { name: 'source_market', label: 'Marché / devise source', span: 1 },
  { name: 'compatibility_confirmed', type: 'switch', switchLabel: 'Compatibilité véhicule confirmée', hint: 'Nécessite une référence confirmée (idéalement par VIN).' },
  { section: 'Prix Maroc' },
  { name: 'price_oem', label: 'Prix OEM', type: 'money', span: 1, nullable: true },
  { name: 'price_aftermarket', label: 'Prix adaptable', type: 'money', span: 1, nullable: true },
  { name: 'price_used', label: 'Prix occasion', type: 'money', span: 1, nullable: true },
  { name: 'part', label: 'Pièce du stock liée', type: 'resource', resource: resources.parts,
    getLabel: (p) => `${p.reference} · ${p.designation}`, getSubLabel: (p) => `${p.quantity} en stock · ${formatMoney(p.sale_price)}` },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

export const oemDefaults = { status: 'unknown', compatibility_confirmed: false }

export const equivalenceFields = [
  { name: 'oem', label: 'Ligne OEM', type: 'resource', resource: resources.oemReferences, required: true,
    getLabel: (o) => `${o.designation} · ${o.brand} ${o.model}`, getSubLabel: (o) => o.oem_reference || 'Référence OEM inconnue' },
  { name: 'kind', label: "Type d'équivalence", type: 'select', options: OEM_EQUIVALENCE_KINDS, required: true },
  { name: 'manufacturer', label: 'Fabricant', span: 1, placeholder: 'Valeo, Bosch, TRW…' },
  { name: 'reference', label: 'Référence équivalente', span: 1, required: true, transform: (v) => v.toUpperCase() },
  { name: 'price', label: 'Prix Maroc', type: 'money', span: 1, nullable: true },
  { name: 'supplier', label: 'Fournisseur', type: 'resource', resource: resources.suppliers, getLabel: (s) => s.name, span: 1 },
  { name: 'source_url', label: 'Source / URL' },
  { name: 'verified_at', label: 'Date de vérification', type: 'date', span: 1 },
  { name: 'verified', type: 'switch', switchLabel: 'Équivalence vérifiée', hint: 'Source et date obligatoires.' },
  { name: 'notes', label: 'Notes' },
]
