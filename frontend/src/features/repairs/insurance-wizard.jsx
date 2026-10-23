import { ArrowLeft, ArrowRight, CheckCircle2, Circle, FileCheck2, Plus, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Money } from '@/components/common/money'
import { ResourceForm } from '@/components/common/resource-form'
import { StatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/input'
import { useList, useSave } from '@/hooks/use-resource'
import { resources } from '@/lib/api'
import { QUOTE_STATUSES } from '@/lib/choices'
import { cn, formatDate } from '@/lib/utils'
import { DocumentsGallery } from '@/features/reports/documents-gallery'

const STEPS = [
  { n: 1, title: 'Client et véhicule', hint: 'Identifier l’assuré et le véhicule' },
  { n: 2, title: 'Documents et photos', hint: 'Constat, carte grise, photos des dommages' },
  { n: 3, title: 'Sinistre et assurance', hint: 'Compagnie, n° de sinistre, circonstances' },
  { n: 4, title: 'Expertise', hint: 'Expert chargé du dossier et rendez-vous' },
  { n: 5, title: 'Dommages et opérations', hint: 'Description des dommages constatés' },
  { n: 6, title: 'Devis', hint: 'Préparer et calculer le devis' },
  { n: 7, title: 'Vérification', hint: 'Contrôler et valider le dossier' },
  { n: 8, title: 'Envoi et suivi', hint: 'Envoi officiel et réponse de l’assurance' },
]

const STEP_FIELDS = {
  3: [
    { name: 'insurance_company', label: "Compagnie d'assurance", type: 'resource', resource: resources.insurers, required: true, getLabel: (i) => i.name },
    { name: 'claim_number', label: 'N° de sinistre', span: 1, required: true },
    { name: 'policy_number', label: 'N° de police', span: 1 },
    { name: 'accident_date', label: 'Date du sinistre', type: 'date', span: 1 },
    { name: 'accident_circumstances', label: 'Circonstances', type: 'textarea' },
  ],
  4: [
    { name: 'expert', label: 'Expert', type: 'resource', resource: resources.experts, getLabel: (e) => e.full_name, getSubLabel: (e) => e.firm,
      params: (v) => (v.insurance_company ? { companies: v.insurance_company } : {}) },
    { name: 'expertise_date', label: "Date d'expertise", type: 'date', span: 1 },
    { name: 'insurance_estimated_amount', label: 'Montant estimé', type: 'money', span: 1 },
  ],
  5: [{ name: 'description', label: 'Dommages constatés et opérations envisagées', type: 'textarea', placeholder: 'Pare-chocs avant fissuré — remplacer ; aile AVD — redresser et peindre…' }],
  7: [
    { name: 'insurance_approved_amount', label: 'Montant approuvé par l’assurance (TTC)', type: 'money', span: 1 },
    { name: 'deductible', label: 'Franchise à la charge du client', type: 'money', span: 1 },
  ],
}
const PICK = ['insurance_company', 'claim_number', 'policy_number', 'accident_date', 'accident_circumstances', 'expert', 'expertise_date',
  'insurance_estimated_amount', 'description', 'insurance_approved_amount', 'deductible']

function Check({ ok, children }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
      <span className={ok ? '' : 'text-muted-foreground'}>{children}</span>
    </li>
  )
}

/** Eight simple pages with Précédent / Continuer. Nothing is sent officially without explicit human validation. */
export function InsuranceWizard({ ro }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(ro.insurance_step || 1)
  const [values, setValues] = useState({})
  const [validated, setValidated] = useState(false)
  const save = useSave(resources.repairOrders, { success: false })
  const { data: quotes } = useList(resources.quotes, { repair_order: ro.id, latest: 1 })
  const { data: docs } = useList(resources.documents, { repair_order: ro.id, page_size: 100 })
  const createQuote = useSave(resources.quotes, { success: 'Devis assurance créé', onSuccess: (q) => navigate(`/devis/${q.id}`) })
  const quoteList = quotes?.results ?? []
  const accepted = quoteList.find((q) => q.status === 'accepted')

  useEffect(() => { setValues(Object.fromEntries(PICK.map((k) => [k, ro[k]]))) }, [ro])

  const go = (target, extra = {}) => {
    const fields = STEP_FIELDS[step] ?? []
    const patch = Object.fromEntries(fields.map((f) => [f.name, values[f.name] === '' ? null : values[f.name]]))
    save.mutate({ id: ro.id, ...patch, ...extra, insurance_step: Math.max(target, ro.insurance_step || 1) }, { onSuccess: () => setStep(target) })
  }

  const markSent = () => go(8, { status: 'waiting_insurance' })
  const markApproved = () => save.mutate({ id: ro.id, status: 'waiting_parts', insurance_approved_amount: values.insurance_approved_amount || accepted?.totals.total_ttc || 0 })

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit p-2">
        <ol>
          {STEPS.map((s) => {
            const reached = s.n <= (ro.insurance_step || 1)
            return (
              <li key={s.n}>
                <button
                  onClick={() => reached && setStep(s.n)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    step === s.n ? 'bg-primary-soft' : reached ? 'hover:bg-muted cursor-pointer' : 'cursor-default opacity-50')}
                >
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular',
                    step === s.n ? 'bg-primary text-primary-foreground' : s.n < (ro.insurance_step || 1) ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                    {s.n < (ro.insurance_step || 1) && step !== s.n ? '✓' : s.n}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block truncate text-sm font-medium', step === s.n && 'text-primary-soft-foreground')}>{s.title}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </Card>

      <Card className="flex min-h-[420px] flex-col">
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Étape {step} sur 8</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{STEPS[step - 1].title}</h3>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1].hint}</p>
          <div className="mt-4 flex gap-1">{STEPS.map((s) => <span key={s.n} className={cn('h-1 flex-1 rounded-full', s.n <= step ? 'bg-primary' : 'bg-muted')} />)}</div>
        </div>

        <div className="flex-1 px-6 py-6">
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Assuré</p>
                <p className="mt-1 font-semibold">{ro.client_name}</p>
                <p className="text-sm text-muted-foreground">{ro.client_phone}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Véhicule</p>
                <p className="mt-1 font-semibold">{ro.vehicle_label}</p>
                <p className="text-sm text-muted-foreground">Entrée le {formatDate(ro.entry_date)} · {ro.mileage_in ?? '—'} km</p>
              </div>
              <p className="text-sm text-muted-foreground sm:col-span-2">Vérifiez que le client et le véhicule correspondent au constat avant de continuer.</p>
            </div>
          )}
          {step === 2 && <DocumentsGallery params={{ repair_order: ro.id }} defaults={{ repair_order: ro.id, client: ro.client, vehicle: ro.vehicle }} />}
          {STEP_FIELDS[step] && <ResourceForm fields={STEP_FIELDS[step]} values={values} onChange={setValues} />}
          {step === 6 && (
            <div className="mt-0 space-y-3">
              {quoteList.map((q) => (
                <button key={q.id} onClick={() => navigate(`/devis/${q.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left hover:bg-muted/50 cursor-pointer">
                  <FileCheck2 className="size-5 text-muted-foreground" />
                  <span className="flex-1"><span className="font-mono text-sm font-semibold">{q.number} v{q.version}</span><span className="block text-xs text-muted-foreground">{q.kind_label}</span></span>
                  <StatusBadge list={QUOTE_STATUSES} value={q.status} />
                  <Money value={q.totals.total_ttc} className="font-semibold" />
                </button>
              ))}
              <Button variant="soft" icon={Plus} loading={createQuote.isPending} onClick={() => createQuote.mutate({ repair_order: ro.id, kind: 'insurance' })}>
                Préparer un devis assurance
              </Button>
            </div>
          )}
          {step === 7 && (
            <ul className="mt-6 space-y-2.5 rounded-xl border border-border bg-muted/30 p-4">
              <Check ok={!!ro.insurance_company}>Compagnie d’assurance renseignée</Check>
              <Check ok={!!ro.claim_number}>Numéro de sinistre renseigné</Check>
              <Check ok={(docs?.count ?? 0) > 0}>{docs?.count ?? 0} document(s) / photo(s) joint(s)</Check>
              <Check ok={!!ro.expert}>Expert désigné {ro.expert_name && `(${ro.expert_name})`}</Check>
              <Check ok={!!ro.description}>Dommages décrits</Check>
              <Check ok={quoteList.length > 0}>Devis préparé {quoteList[0] && `— ${quoteList[0].number}`}</Check>
            </ul>
          )}
          {step === 8 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                <Switch checked={validated} onChange={setValidated} label="Je valide le dossier pour l’envoi officiel"
                  description="Aucun envoi à l’assurance n’est effectué sans cette validation humaine." />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={Send} disabled={!validated} loading={save.isPending} onClick={markSent} variant="dark">Marquer comme envoyé à l’assurance</Button>
                {quoteList[0] && <Button onClick={() => window.open(`/imprimer/devis/${quoteList[0].id}`, '_blank')}>Imprimer le devis</Button>}
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium">Réponse de l’assurance</p>
                <p className="mt-1 text-sm text-muted-foreground">Statut actuel : <span className="font-medium text-foreground">{ro.status_label}</span></p>
                <Button className="mt-3" variant="primary" icon={ShieldCheck} disabled={ro.status !== 'waiting_insurance'} onClick={markApproved}>
                  Accord reçu — lancer la réparation
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button icon={ArrowLeft} disabled={step === 1} onClick={() => setStep(step - 1)}>Précédent</Button>
          {step < 8 && <Button variant="primary" loading={save.isPending} onClick={() => go(step + 1)}>Continuer <ArrowRight className="size-4" /></Button>}
        </div>
      </Card>
    </div>
  )
}
