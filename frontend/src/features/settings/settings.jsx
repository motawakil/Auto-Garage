import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, DatabaseBackup, KeyRound, ShieldCheck, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CrudPage } from '@/components/common/crud-page'
import { DataTable } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { ResourceForm } from '@/components/common/resource-form'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Can, useAuth } from '@/context/auth-provider'
import { api, authApi, resources, showApiError } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { useGarageSettings } from '@/features/quotes/use-settings'

const garageFields = [
  { section: 'Identité du garage' },
  { name: 'name', label: 'Nom commercial', required: true },
  { name: 'slogan', label: 'Activités' },
  { name: 'address', label: 'Adresse' },
  { name: 'city', label: 'Ville', span: 1 },
  { name: 'phone', label: 'Téléphone', span: 1 },
  { name: 'email', label: 'E-mail', type: 'email' },
  { section: 'Mentions légales' },
  { name: 'ice', label: 'ICE', span: 1 }, { name: 'rc', label: 'RC', span: 1 },
  { name: 'if_number', label: 'IF', span: 1 }, { name: 'patente', label: 'Patente', span: 1 },
  { name: 'rib', label: 'RIB' },
  { section: 'Facturation' },
  { name: 'parts_vat_rate', label: 'TVA sur pièces', type: 'number', step: '0.01', suffix: '%', span: 1 },
  { name: 'services_vat_rate', label: 'TVA sur prestations', type: 'number', step: '0.01', suffix: '%', span: 1, hint: 'Règle actuelle : prestations maintenues en HT.' },
  { name: 'quote_validity_days', label: 'Validité des devis', type: 'number', suffix: 'jours', span: 1 },
  { name: 'invoice_due_days', label: 'Échéance des factures', type: 'number', suffix: 'jours', span: 1 },
  { name: 'invoice_footer', label: 'Pied de page des documents', type: 'textarea' },
]

const insurerFields = [
  { name: 'name', label: 'Compagnie', required: true },
  { name: 'phone', label: 'Téléphone', span: 1 }, { name: 'email', label: 'E-mail', type: 'email', span: 1 },
  { name: 'address', label: 'Adresse' },
  { name: 'payment_delay_days', label: 'Délai de paiement habituel', type: 'number', suffix: 'jours', span: 1 },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]
const expertFields = [
  { name: 'first_name', label: 'Prénom', span: 1 }, { name: 'last_name', label: 'Nom', span: 1, required: true },
  { name: 'firm', label: 'Cabinet' },
  { name: 'phone', label: 'Téléphone', span: 1 }, { name: 'email', label: 'E-mail', type: 'email', span: 1 },
  { name: 'companies', label: 'Compagnies associées', type: 'resource', multiple: true, resource: resources.insurers, getLabel: (i) => i.name },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

function GarageForm() {
  const { data } = useGarageSettings()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()
  useEffect(() => { if (data) setValues(data) }, [data])
  const save = async () => {
    setSaving(true)
    try {
      await api.patch('/settings/', values)
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Paramètres enregistrés')
    } catch (e) { showApiError(e) } finally { setSaving(false) }
  }
  return (
    <Card className="max-w-3xl">
      <CardHeader title="Garage El Jaouhari" description="Ces informations apparaissent sur les devis, factures et reçus." icon={Building2} />
      <CardBody><ResourceForm fields={garageFields} values={values} onChange={setValues} /></CardBody>
      <div className="flex justify-end border-t border-border px-5 py-3"><Button variant="primary" onClick={save} loading={saving}>Enregistrer</Button></div>
    </Card>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('garage')
  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres & sécurité" description="Configuration du garage, répertoires assurances et experts, sécurité." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'garage', label: 'Garage', icon: Building2 }, { value: 'insurers', label: 'Assurances', icon: ShieldCheck },
        { value: 'experts', label: 'Experts', icon: UserCog }, { value: 'users', label: 'Utilisateurs', icon: Users },
        { value: 'security', label: 'Sécurité', icon: KeyRound },
      ]} />
      {tab === 'garage' && <GarageForm />}
      {tab === 'insurers' && (
        <CrudPage embedded resource={resources.insurers} fields={insurerFields} newLabel="Nouvelle compagnie" panelIcon={ShieldCheck} panelTitle={(i) => i.name}
          defaults={{ payment_delay_days: 60 }}
          columns={[
            { key: 'name', header: 'Compagnie', mobile: 'title', render: (i) => <span className="font-medium">{i.name}</span> },
            { key: 'phone', header: 'Téléphone', mobile: 'subtitle', render: (i) => i.phone || '—' },
            { key: 'delay', header: 'Délai de paiement', render: (i) => `${i.payment_delay_days} jours` },
            { key: 'count', header: 'Dossiers', align: 'right', render: (i) => <span className="tabular">{i.repairs_count}</span> },
          ]} />
      )}
      {tab === 'experts' && (
        <CrudPage embedded resource={resources.experts} fields={expertFields} newLabel="Nouvel expert" panelIcon={UserCog} panelTitle={(e) => e.full_name}
          defaults={{ companies: [] }}
          columns={[
            { key: 'name', header: 'Expert', mobile: 'title', render: (e) => <div><p className="font-medium">{e.full_name}</p><p className="text-xs text-muted-foreground">{e.firm}</p></div> },
            { key: 'phone', header: 'Téléphone', mobile: 'subtitle', render: (e) => e.phone || '—' },
            { key: 'companies', header: 'Compagnies', render: (e) => <div className="flex flex-wrap gap-1">{e.company_names.map((c) => <Badge key={c}>{c}</Badge>)}</div> },
            { key: 'count', header: 'Expertises', align: 'right', render: (e) => <span className="tabular">{e.repairs_count}</span> },
          ]} />
      )}
      {tab === 'users' && <Can permission="users.view"><CompanyUsers /></Can>}
      {tab === 'security' && (
        <div className="grid max-w-4xl gap-4 md:grid-cols-2">
          {[
            { icon: KeyRound, title: 'Authentification', text: 'Session par cookies httpOnly (JWT 15 min, renouvellement avec rotation et révocation), protection CSRF, verrouillage après 5 échecs de connexion.' },
            { icon: Users, title: 'Rôles', text: 'Administrateur : accès complet. Utilisateur : tous les modules métier, sans les paramètres ni la gestion des référentiels. Droits à valider avec le garage.' },
            { icon: DatabaseBackup, title: 'Sauvegardes', text: 'Base SQLite locale en développement : sauvegardez backend/db.sqlite3 et media/. PostgreSQL et sauvegardes automatiques prévus pour la production.' },
            { icon: ShieldCheck, title: 'Cloisonnement', text: 'Chaque compte appartient à une seule entreprise : ses données (clients, dossiers, factures, fichiers…) sont invisibles des autres garages.' },
            { icon: Building2, title: 'Comptes', text: 'Entreprises et identifiants sont créés par la plateforme (futur portail sécurisé), jamais depuis l’application du garage.' },
          ].map((b) => (
            <Card key={b.title} className="p-5">
              <b.icon className="size-5 text-primary" />
              <p className="mt-3 font-semibold">{b.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyUsers() {
  const { company } = useAuth()
  const { data = [], isLoading } = useQuery({ queryKey: ['company-users'], queryFn: authApi.users })
  return (
    <Card className="overflow-hidden">
      <CardHeader title={`Utilisateurs — ${company?.name}`} description="Les comptes sont créés et désactivés depuis le portail de la plateforme." icon={Users} />
      <DataTable
        rows={data}
        loading={isLoading}
        columns={[
          { key: 'name', header: 'Utilisateur', mobile: 'title', render: (u) => <div className="flex items-center gap-3"><Avatar name={u.full_name} /><div><p className="font-medium">{u.full_name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div> },
          { key: 'role', header: 'Rôle', mobile: 'subtitle', render: (u) => <Badge tone={u.role === 'admin' ? 'red' : 'neutral'}>{u.role_label}</Badge> },
          { key: 'active', header: 'Statut', render: (u) => <Badge tone={u.is_active ? 'green' : 'neutral'} dot>{u.is_active ? 'Actif' : 'Désactivé'}</Badge> },
          { key: 'login', header: 'Dernière connexion', render: (u) => <span className="text-muted-foreground">{u.last_login ? formatRelative(u.last_login) : 'Jamais'}</span> },
        ]}
      />
    </Card>
  )
}
