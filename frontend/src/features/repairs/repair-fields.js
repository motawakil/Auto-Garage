import { resources } from '@/lib/api'
import { PRIORITIES, REPAIR_STATUSES, REPAIR_TYPES } from '@/lib/choices'
import { today } from '@/lib/utils'

export const repairFields = [
  { section: 'Client & véhicule' },
  { name: 'client', label: 'Client', type: 'resource', resource: resources.clients, required: true,
    getLabel: (c) => c.display_name, getSubLabel: (c) => `${c.code} · ${c.phone}`, onPick: () => ({ vehicle: null }) },
  { name: 'vehicle', label: 'Véhicule', type: 'resource', resource: resources.vehicles, required: true,
    params: (v) => (v.client ? { client: v.client } : {}), disabled: (v) => !v.client,
    placeholder: 'Sélectionnez d’abord le client', getLabel: (v) => `${v.brand} ${v.model} · ${v.plate}`, getSubLabel: (v) => v.client_name,
    onPick: (v) => (v?.mileage ? { mileage_in: v.mileage } : {}) },
  { section: 'Intervention' },
  { name: 'repair_type', label: 'Type de réparation', type: 'select', options: REPAIR_TYPES, span: 1, required: true },
  { name: 'priority', label: 'Priorité', type: 'select', options: PRIORITIES, span: 1, required: true },
  { name: 'entry_date', label: "Date d'entrée", type: 'date', span: 1, required: true },
  { name: 'expected_delivery_date', label: 'Livraison prévue', type: 'date', span: 1 },
  { name: 'mileage_in', label: "Kilométrage à l'entrée", type: 'number', suffix: 'km', span: 1 },
  { name: 'status', label: 'Statut', type: 'select', options: REPAIR_STATUSES, span: 1, required: true },
  { name: 'description', label: 'Description des dommages ou de la panne', type: 'textarea' },
  { name: 'employees', label: 'Employés responsables', type: 'resource', multiple: true, resource: resources.employees,
    params: { is_active: true }, getLabel: (e) => e.full_name, getSubLabel: (e) => e.role_label },
  { section: 'Assurance' },
  { name: 'is_insurance', type: 'switch', switchLabel: 'Sinistre pris en charge par une assurance', hint: 'Active le workflow d’expertise en 8 étapes.' },
  { name: 'insurance_company', label: "Compagnie d'assurance", type: 'resource', resource: resources.insurers, show: (v) => v.is_insurance, getLabel: (i) => i.name },
  { name: 'claim_number', label: 'N° de sinistre', span: 1, show: (v) => v.is_insurance },
  { name: 'policy_number', label: 'N° de police', span: 1, show: (v) => v.is_insurance },
  { name: 'notes', label: 'Notes internes', type: 'textarea' },
]

export const repairDefaults = () => ({ repair_type: 'mechanical', priority: 'normal', status: 'new', entry_date: today(), employees: [], is_insurance: false })
