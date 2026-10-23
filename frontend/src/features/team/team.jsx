import { Pencil, Phone, Plus, UsersRound } from 'lucide-react'
import { useState } from 'react'

import { FormPanel } from '@/components/common/form-panel'
import { PageHeader } from '@/components/common/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/tabs'
import { useList } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { EMPLOYEE_ROLES, toneOf } from '@/lib/choices'
import { cn, formatMoney } from '@/lib/utils'
import { TaskList } from '@/features/repairs/task-list'

const fields = [
  { name: 'first_name', label: 'Prénom', span: 1, required: true },
  { name: 'last_name', label: 'Nom', span: 1, required: true },
  { name: 'role', label: 'Rôle', type: 'select', options: EMPLOYEE_ROLES, span: 1, required: true },
  { name: 'color', label: 'Couleur', type: 'color', span: 1 },
  { name: 'phone', label: 'Téléphone', type: 'tel', span: 1 },
  { name: 'email', label: 'E-mail', type: 'email', span: 1 },
  { name: 'hourly_cost', label: 'Coût horaire', type: 'money', span: 1, hint: 'Pour le calcul de la main-d’œuvre.' },
  { name: 'hired_at', label: "Date d'embauche", type: 'date', span: 1 },
  { name: 'is_active', type: 'switch', switchLabel: 'Employé actif' },
]

export default function Team() {
  const [editing, setEditing] = useState(null)
  const [employee, setEmployee] = useState('')
  const [scope, setScope] = useState('open')
  const { data, isLoading } = useList(resources.employees, { page_size: 100 })
  const rows = data?.results ?? []
  const maxLoad = Math.max(1, ...rows.map((e) => e.open_tasks))

  return (
    <div className="space-y-6">
      <PageHeader title="Employés & tâches" description="Affectation, avancement et répartition de la charge de l’atelier."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing({})}>Nouvel employé</Button>} />

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            {rows.map((e) => (
              <Card
                key={e.id}
                onClick={() => setEmployee(employee === String(e.id) ? '' : String(e.id))}
                className={cn('group cursor-pointer p-4 transition-all hover:shadow-pop', employee === String(e.id) && 'ring-2 ring-primary', !e.is_active && 'opacity-60')}
              >
                <div className="flex items-start justify-between">
                  <Avatar name={e.full_name} color={e.color} size="lg" />
                  <button onClick={(ev) => { ev.stopPropagation(); setEditing(e) }} className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 cursor-pointer"><Pencil className="size-3.5" /></button>
                </div>
                <p className="mt-3 truncate font-semibold">{e.full_name}</p>
                <div className="mt-1 flex items-center gap-2"><Badge tone={toneOf(EMPLOYEE_ROLES, e.role)}>{e.role_label}</Badge></div>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{e.phone || '—'}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Charge</span><span className="tabular">{e.open_tasks} ouverte(s){e.late_tasks > 0 && <span className="ml-1 font-semibold text-red-600">· {e.late_tasks} en retard</span>}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(e.open_tasks / maxLoad) * 100}%`, background: e.color || 'var(--primary)' }} /></div>
                </div>
                {Number(e.hourly_cost) > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{formatMoney(e.hourly_cost)} / h · {e.done_tasks} terminée(s)</p>}
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{employee ? `Tâches de ${rows.find((e) => String(e.id) === employee)?.full_name}` : 'Toutes les tâches'}</h2>
            <Segmented value={scope} onChange={setScope} options={[{ value: 'open', label: 'À faire' }, { value: 'all', label: 'Toutes' }]} />
          </div>
          <TaskList key={`${employee}-${scope}`} showRepair title="Planning de l’atelier"
            params={{ ...(employee ? { employee } : {}), ...(scope === 'open' ? { open: 1 } : {}) }} />
        </div>
        <FormPanel open={!!editing} onClose={() => setEditing(null)} resource={resources.employees} item={editing?.id ? editing : null} fields={fields}
          defaults={{ role: 'mechanic', is_active: true, color: '#ef4444' }} title={editing?.id ? editing.full_name : 'Nouvel employé'} icon={UsersRound} />
      </div>
    </div>
  )
}
