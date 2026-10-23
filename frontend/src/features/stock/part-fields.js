import { resources } from '@/lib/api'
import { CAR_BRANDS, PART_CATEGORIES, PART_CONDITIONS } from '@/lib/choices'

export const partFields = (isNew) => [
  { section: 'Identification' },
  { name: 'designation', label: 'Désignation', required: true },
  { name: 'reference', label: 'Référence interne', span: 1, required: true, transform: (v) => v.toUpperCase() },
  { name: 'oem_reference', label: 'Référence OEM', span: 1, hint: 'Laisser vide si inconnue — ne jamais inventer.' },
  { name: 'alt_references', label: 'Références alternatives vérifiées' },
  { name: 'category', label: 'Catégorie', type: 'select', options: PART_CATEGORIES, span: 1, required: true },
  { name: 'condition', label: 'État', type: 'select', options: PART_CONDITIONS, span: 1, required: true },
  { section: 'Compatibilité' },
  { name: 'brand', label: 'Marque', type: 'select', options: CAR_BRANDS.map((b) => ({ value: b, label: b })), span: 1, placeholder: 'Universelle' },
  { name: 'compatible_models', label: 'Modèles compatibles', span: 1, placeholder: 'Clio IV, Captur' },
  { name: 'year_from', label: 'Année de', type: 'number', span: 1 },
  { name: 'year_to', label: 'Année à', type: 'number', span: 1 },
  { name: 'engines', label: 'Motorisations', placeholder: '1.5 dCi, 1.2 TCe' },
  { name: 'compatibility_verified', type: 'switch', switchLabel: 'Compatibilité vérifiée', hint: 'Source fiable (catalogue constructeur, VIN).' },
  { section: 'Prix & stock' },
  { name: 'purchase_price', label: "Prix d'achat HT", type: 'money', span: 1 },
  { name: 'sale_price', label: 'Prix de vente HT', type: 'money', span: 1 },
  { name: 'supplier', label: 'Fournisseur', type: 'resource', resource: resources.suppliers, getLabel: (s) => s.name },
  ...(isNew ? [{ name: 'quantity', label: 'Quantité initiale', type: 'number', span: 1 }] : []),
  { name: 'min_quantity', label: 'Stock minimum', type: 'number', span: 1 },
  { name: 'location', label: 'Emplacement', span: 1, placeholder: 'R2-E3' },
]
