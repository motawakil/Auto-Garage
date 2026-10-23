import { Route, Routes } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { AppLayout } from '@/components/layout/app-layout'
import ClientDetail from '@/features/clients/client-detail'
import Clients from '@/features/clients/clients'
import Compatibility from '@/features/compatibility/compatibility'
import Dashboard from '@/features/dashboard/dashboard'
import InvoiceDetail from '@/features/invoices/invoice-detail'
import Invoices from '@/features/invoices/invoices'
import Notifications from '@/features/notifications/notifications'
import Payments from '@/features/payments/payments'
import PrintDocument from '@/features/print/print-document'
import QuoteDetail from '@/features/quotes/quote-detail'
import Quotes from '@/features/quotes/quotes'
import RepairDetail from '@/features/repairs/repair-detail'
import Repairs from '@/features/repairs/repairs'
import Reports from '@/features/reports/reports'
import Settings from '@/features/settings/settings'
import Stock from '@/features/stock/stock'
import Suppliers from '@/features/suppliers/suppliers'
import Team from '@/features/team/team'
import Vehicles from '@/features/vehicles/vehicles'

export default function App() {
  return (
    <Routes>
      <Route path="/imprimer/:kind/:id" element={<PrintDocument />} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="vehicules" element={<Vehicles />} />
        <Route path="dossiers" element={<Repairs />} />
        <Route path="dossiers/:id" element={<RepairDetail />} />
        <Route path="devis" element={<Quotes />} />
        <Route path="devis/:id" element={<QuoteDetail />} />
        <Route path="factures" element={<Invoices />} />
        <Route path="factures/:id" element={<InvoiceDetail />} />
        <Route path="paiements" element={<Payments />} />
        <Route path="compatibilite" element={<Compatibility />} />
        <Route path="stock" element={<Stock />} />
        <Route path="fournisseurs" element={<Suppliers />} />
        <Route path="equipe" element={<Team />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="rapports" element={<Reports />} />
        <Route path="parametres" element={<Settings />} />
        <Route path="*" element={<EmptyState title="Page introuvable" description="Cette page n'existe pas ou a été déplacée." />} />
      </Route>
    </Routes>
  )
}
