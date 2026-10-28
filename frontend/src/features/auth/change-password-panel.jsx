import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Panel } from '@/components/common/panel'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { authApi, getFieldErrors, showApiError } from '@/lib/api'

const EMPTY = { current_password: '', new_password: '', confirm: '' }

export function ChangePasswordPanel({ open, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const close = () => { setForm(EMPTY); setErrors({}); onClose() }

  const submit = async (e) => {
    e?.preventDefault()
    if (form.new_password !== form.confirm) return setErrors({ confirm: 'Les deux mots de passe ne correspondent pas.' })
    setLoading(true)
    try {
      await authApi.changePassword({ current_password: form.current_password, new_password: form.new_password })
      toast.success('Mot de passe modifié')
      close()
    } catch (err) {
      setErrors(getFieldErrors(err))
      showApiError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel open={open} onClose={close} title="Changer le mot de passe" subtitle="Sécurité du compte" icon={KeyRound}
      footer={<><Button onClick={close}>Annuler</Button><Button variant="primary" loading={loading} onClick={submit}>Enregistrer</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mot de passe actuel" error={errors.current_password} required>
          <Input type="password" autoComplete="current-password" value={form.current_password} onChange={set('current_password')} aria-invalid={!!errors.current_password} />
        </Field>
        <Field label="Nouveau mot de passe" error={errors.new_password} hint="10 caractères minimum, ni trop courant ni uniquement numérique." required>
          <Input type="password" autoComplete="new-password" value={form.new_password} onChange={set('new_password')} aria-invalid={!!errors.new_password} />
        </Field>
        <Field label="Confirmer le nouveau mot de passe" error={errors.confirm} required>
          <Input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Panel>
  )
}
