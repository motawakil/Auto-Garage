import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { LogoMark } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-provider'
import { getApiErrorMessage } from '@/lib/api'
import { safeNext } from '@/routes/protected-route'

const DEMO_ACCOUNTS = [
  { label: 'Administrateur', email: 'admin@eljaouhari.ma', password: 'Demo-Admin-2026!' },
  { label: 'Utilisateur atelier', email: 'atelier@eljaouhari.ma', password: 'Demo-Atelier-2026!' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      navigate(safeNext(params.get('suite')), { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Connexion impossible. Vérifiez votre réseau.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[520px] rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 size-96 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <LogoMark className="size-11" />
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">El Jaouhari</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">Garage Manager</p>
          </div>
        </div>
        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">L’atelier, les devis et la caisse au même endroit.</h1>
          <p className="mt-4 text-white/60">De l’accueil du véhicule à l’encaissement, sur PC comme sur téléphone.</p>
          <ul className="mt-8 space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-3"><Wrench className="size-4 text-red-400" />Dossiers, devis versionnés et factures verrouillées</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-red-400" />Données cloisonnées par entreprise, accès par rôle</li>
            <li className="flex items-center gap-3"><Lock className="size-4 text-red-400" />Session sécurisée, verrouillage après échecs répétés</li>
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-white/35">© {new Date().getFullYear()} Garage El Jaouhari · Manager 2027</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="size-10" />
            <p className="text-lg font-semibold tracking-tight">El Jaouhari <span className="font-normal text-muted-foreground">Manager</span></p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
          <p className="mt-1 text-sm text-muted-foreground">Accédez à l’espace de votre garage.</p>

          {params.get('raison') === 'session' && !error && (
            <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Votre session a expiré. Reconnectez-vous pour continuer.
            </div>
          )}
          {error && (
            <div role="alert" className="mt-6 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Adresse e-mail" htmlFor="email">
              <Input id="email" type="email" autoComplete="username" required autoFocus icon={Mail} className="h-11"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@garage.ma" />
            </Field>
            <Field label="Mot de passe" htmlFor="password">
              <div className="relative">
                <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required icon={Lock} className="h-11 pr-11"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Se connecter</Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Les comptes sont créés par l’administrateur de la plateforme. Mot de passe oublié : contactez votre administrateur.
          </p>

          {import.meta.env.DEV && (
            <div className="mt-8 rounded-xl border border-dashed border-border p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comptes de démonstration (développement)</p>
              <div className="mt-2 grid gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button key={a.email} type="button" onClick={() => setForm({ email: a.email, password: a.password })}
                    className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer">
                    <span className="font-medium">{a.label}</span><span className="text-xs text-muted-foreground">{a.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
