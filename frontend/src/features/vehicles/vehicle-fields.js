import { resources } from '@/lib/api'
import { CAR_BRANDS, FUELS } from '@/lib/choices'

export const vehicleFields = (withClient = true) => [
  ...(withClient ? [
    { section: 'Propriétaire' },
    { name: 'client', label: 'Client', type: 'resource', resource: resources.clients, required: true,
      getLabel: (c) => c.display_name, getSubLabel: (c) => `${c.code} · ${c.phone}` },
  ] : []),
  { section: 'Véhicule' },
  { name: 'brand', label: 'Marque', type: 'select', options: CAR_BRANDS.map((b) => ({ value: b, label: b })), span: 1, required: true },
  { name: 'model', label: 'Modèle', span: 1, required: true, placeholder: 'Clio IV' },
  { name: 'generation', label: 'Génération / version', span: 1 },
  { name: 'year', label: 'Année', type: 'number', span: 1 },
  { name: 'engine', label: 'Motorisation', span: 1, placeholder: '1.5 dCi 90' },
  { name: 'fuel', label: 'Carburant', type: 'select', options: FUELS, span: 1 },
  { section: 'Identification' },
  { name: 'plate', label: 'Immatriculation', span: 1, required: true, placeholder: '12345-A-6', transform: (v) => v.toUpperCase() },
  { name: 'vin', label: 'N° VIN', span: 1, placeholder: '17 caractères', transform: (v) => v.toUpperCase() },
  { name: 'color', label: 'Couleur', span: 1 },
  { name: 'mileage', label: 'Kilométrage', type: 'number', span: 1, suffix: 'km' },
  { name: 'notes', label: 'Informations techniques', type: 'textarea' },
]
