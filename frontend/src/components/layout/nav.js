import {
  Bell, Boxes, Car, ClipboardList, FileBarChart, FileCheck2, LayoutDashboard, Receipt, ScanSearch,
  Settings, Truck, Users, UsersRound, Wallet, Wrench,
} from 'lucide-react'

export const NAV = [
  { group: 'Pilotage', items: [
    { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
  ] },
  { group: 'Atelier', items: [
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/vehicules', label: 'Véhicules', icon: Car },
    { to: '/dossiers', label: 'Dossiers de réparation', icon: Wrench },
    { to: '/devis', label: 'Devis & expertises', icon: FileCheck2 },
    { to: '/equipe', label: 'Employés & tâches', icon: UsersRound },
  ] },
  { group: 'Finance', items: [
    { to: '/factures', label: 'Factures', icon: Receipt },
    { to: '/paiements', label: 'Paiements', icon: Wallet },
  ] },
  { group: 'Pièces', items: [
    { to: '/compatibilite', label: 'Compatibilité', icon: ScanSearch },
    { to: '/stock', label: 'Stock & pièces', icon: Boxes },
    { to: '/fournisseurs', label: 'Fournisseurs', icon: Truck },
  ] },
  { group: 'Système', items: [
    { to: '/rapports', label: 'Documents & rapports', icon: FileBarChart },
    { to: '/parametres', label: 'Paramètres', icon: Settings },
  ] },
]

export const QUICK_ACTIONS = [
  { label: 'Nouveau dossier de réparation', to: '/dossiers?new=1', icon: Wrench },
  { label: 'Nouveau client', to: '/clients?new=1', icon: Users },
  { label: 'Enregistrer un paiement', to: '/paiements?new=1', icon: Wallet },
  { label: 'Rechercher une pièce compatible', to: '/compatibilite', icon: ScanSearch },
  { label: 'Tâches de l’atelier', to: '/equipe', icon: ClipboardList },
]
