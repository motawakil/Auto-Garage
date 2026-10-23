// Mirrors the Django choices. `tone` drives badge colours across the app.
const make = (rows) => rows.map(([value, label, tone = 'neutral']) => ({ value, label, tone }))
export const toneOf = (list, value) => list.find((o) => o.value === value)?.tone ?? 'neutral'
export const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? value ?? '—'

export const REPAIR_STATUSES = make([
  ['new', 'Nouveau dossier', 'blue'],
  ['waiting_documents', 'En attente de documents', 'amber'],
  ['waiting_expertise', "En attente d'expertise", 'amber'],
  ['expertise_done', 'Expertise effectuée', 'violet'],
  ['waiting_insurance', "En attente d'accord assurance", 'amber'],
  ['waiting_quote', 'En attente de validation du devis', 'amber'],
  ['waiting_parts', 'En attente de pièces', 'orange'],
  ['in_progress', 'Réparation en cours', 'red'],
  ['quality_check', 'Contrôle qualité', 'violet'],
  ['done', 'Terminé', 'green'],
  ['delivered', 'Livré au client', 'green'],
  ['waiting_payment', 'En attente de paiement', 'orange'],
  ['closed', 'Clôturé', 'neutral'],
])

export const REPAIR_STAGES = [
  { key: 'intake', label: 'Accueil', statuses: ['new', 'waiting_documents'] },
  { key: 'expertise', label: 'Expertise & devis', statuses: ['waiting_expertise', 'expertise_done', 'waiting_insurance', 'waiting_quote'] },
  { key: 'workshop', label: 'Atelier', statuses: ['waiting_parts', 'in_progress', 'quality_check'] },
  { key: 'delivery', label: 'Livraison', statuses: ['done', 'delivered', 'waiting_payment'] },
  { key: 'closed', label: 'Clôturé', statuses: ['closed'] },
]

export const REPAIR_TYPES = make([
  ['mechanical', 'Mécanique', 'blue'], ['body', 'Carrosserie', 'red'], ['paint', 'Peinture', 'violet'],
  ['polish', 'Polissage', 'amber'], ['electrical', 'Diagnostic électrique', 'orange'], ['other', 'Autre'],
])
export const PRIORITIES = make([['low', 'Basse'], ['normal', 'Normale', 'blue'], ['high', 'Haute', 'orange'], ['urgent', 'Urgente', 'red']])

export const TASK_STATUSES = make([['todo', 'À faire'], ['in_progress', 'En cours', 'blue'], ['blocked', 'Bloquée', 'red'], ['done', 'Terminée', 'green']])
export const TASK_KINDS = make([
  ['disassembly', 'Démontage / remontage'], ['straightening', 'Redressage carrosserie'], ['paint_prep', 'Préparation peinture'],
  ['paint', 'Peinture'], ['polish', 'Polissage et finition'], ['electrical', 'Diagnostic électrique'],
  ['mechanical', 'Réparation mécanique'], ['final_check', 'Contrôle final et livraison'], ['other', 'Autre'],
])

export const QUOTE_STATUSES = make([
  ['draft', 'Brouillon'], ['sent', 'Envoyé', 'blue'], ['pending', 'En attente', 'amber'],
  ['accepted', 'Accepté', 'green'], ['refused', 'Refusé', 'red'], ['cancelled', 'Annulé'],
])
export const QUOTE_KINDS = make([['estimate', 'Devis estimatif'], ['insurance', 'Devis approuvé assurance', 'violet']])

export const INVOICE_STATUSES = make([
  ['draft', 'Brouillon'], ['issued', 'Émise', 'blue'], ['partial', 'Partiellement payée', 'amber'],
  ['paid', 'Payée', 'green'], ['overdue', 'En retard', 'red'], ['disputed', 'En litige', 'orange'], ['cancelled', 'Annulée'],
])

export const LINE_OPERATIONS = make([
  ['repair', 'Réparer'], ['replace_new', 'Remplacer (neuf)'], ['replace_used', 'Remplacer (occasion)'],
  ['pending_disassembly', 'Attendre démontage'], ['labor', "Main-d'œuvre"],
])

export const PAYMENT_KINDS = make([['payment', 'Paiement', 'green'], ['deposit', 'Acompte', 'blue'], ['refund', 'Remboursement', 'red']])
export const PAYMENT_METHODS = make([['cash', 'Espèces'], ['transfer', 'Virement bancaire'], ['cheque', 'Chèque'], ['card', 'Carte bancaire'], ['other', 'Autre']])
export const PAYMENT_ORIGINS = make([['client', 'Client'], ['insurance', 'Assurance', 'violet']])
export const CHEQUE_STATUSES = make([
  ['received', 'Reçu', 'blue'], ['pending', "En attente d'encaissement", 'amber'], ['cashed', 'Encaissé', 'green'],
  ['rejected', 'Rejeté', 'red'], ['cancelled', 'Annulé'],
])

export const CLIENT_KINDS = make([['individual', 'Particulier'], ['company', 'Entreprise', 'blue']])
export const FUELS = make([['diesel', 'Diesel'], ['petrol', 'Essence'], ['hybrid', 'Hybride'], ['electric', 'Électrique'], ['lpg', 'GPL']])
export const PART_CATEGORIES = make([
  ['body', 'Carrosserie'], ['engine', 'Moteur'], ['brakes', 'Freinage'], ['suspension', 'Suspension'], ['electrical', 'Électricité'],
  ['filters', 'Filtration'], ['lighting', 'Éclairage'], ['paint', 'Peinture'], ['fluids', 'Lubrifiants'], ['other', 'Autre'],
])
export const PART_CONDITIONS = make([['new', 'Neuf', 'green'], ['used', 'Occasion', 'amber'], ['refurbished', 'Reconditionné', 'blue']])
export const MOVEMENT_KINDS = make([
  ['in', 'Entrée', 'green'], ['out', 'Sortie réparation', 'red'], ['supplier_return', 'Retour fournisseur', 'orange'],
  ['unused_return', 'Retour pièce inutilisée', 'blue'], ['adjustment', 'Ajustement', 'violet'],
])
export const EMPLOYEE_ROLES = make([
  ['manager', 'Gérant', 'red'], ['reception', 'Réception', 'blue'], ['mechanic', 'Mécanicien'], ['body', 'Carrossier'],
  ['painter', 'Peintre'], ['electrician', 'Électricien'], ['accountant', 'Comptable', 'violet'], ['other', 'Autre'],
])
export const DOCUMENT_KINDS = make([
  ['photo_before', 'Photo avant réparation'], ['photo_progress', 'Photo de progression'], ['photo_after', 'Photo après réparation'],
  ['registration', 'Carte grise'], ['insurance', 'Document assurance'], ['expertise', "Rapport d'expertise"],
  ['invoice', 'Facture'], ['receipt', 'Justificatif de paiement'], ['other', 'Autre'],
])
export const CAR_BRANDS = ['Renault', 'Dacia', 'Peugeot', 'Citroën', 'Opel', 'Mercedes-Benz', 'Volkswagen', 'Audi', 'SEAT', 'Toyota', 'Hyundai', 'Kia', 'Fiat', 'Ford', 'BMW', 'Skoda']

export const OEM_STATUSES = make([['unknown', 'Inconnue — à rechercher'], ['to_verify', 'À vérifier', 'amber'], ['confirmed', 'Confirmée constructeur', 'green']])
export const OEM_EQUIVALENCE_KINDS = make([['supersession', 'Supersession constructeur', 'violet'], ['aftermarket', 'Adaptable (équipementier)', 'blue'], ['used', 'Occasion', 'amber']])
