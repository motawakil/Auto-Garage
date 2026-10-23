import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useConfirm } from '@/context/confirm-dialog-provider'
import { useRemove, useSave } from '@/hooks/use-resource'
import { getFieldErrors, showApiError } from '@/lib/api'
import { Panel } from './panel'
import { ResourceForm, toPayload } from './resource-form'

export function FormPanel({ open, onClose, resource, item, fields, title, subtitle, icon, defaults = {}, fixed, related, onSaved, deletable = true, saveParams, extra, beforeForm, success, onDeleted }) {
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const confirm = useConfirm()

  useEffect(() => {
    if (open) {
      setValues(item ? { ...item } : { ...defaults })
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const save = useSave(resource, {
    related, params: saveParams, success,
    onSuccess: (data, vars) => { onSaved?.(data, vars); onClose() },
    onError: (err) => { setErrors(getFieldErrors(err)); showApiError(err) },
  })
  const remove = useRemove(resource, { related, onSuccess: () => { onClose(); onDeleted?.() } })

  const submit = (e) => {
    e?.preventDefault()
    let payload = toPayload(values, fields)
    if (fixed) {
      if (payload instanceof FormData) Object.entries(fixed).forEach(([k, v]) => v != null && payload.append(k, v))
      else payload = { ...fixed, ...payload }
    }
    if (payload instanceof FormData) {
      if (item?.id) payload.append('id', item.id)
      save.mutate(payload)
    } else {
      save.mutate(item?.id ? { id: item.id, ...payload } : payload)
    }
  }

  const onDelete = async () => {
    const ok = await confirm({ title: 'Supprimer cet élément ?', description: 'Cette action est définitive.', variant: 'destructive', confirmLabel: 'Supprimer' })
    if (ok) remove.mutate(item.id)
  }

  return (
    <Panel
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      footer={
        <>
          {item?.id && deletable && <Button variant="ghost" icon={Trash2} className="mr-auto text-red-600" onClick={onDelete} loading={remove.isPending}>Supprimer</Button>}
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={submit} loading={save.isPending}>{item?.id ? 'Enregistrer' : 'Créer'}</Button>
        </>
      }
    >
      <form onSubmit={submit}>
        {beforeForm?.(values, setValues)}
        <ResourceForm fields={fields} values={values} onChange={setValues} errors={errors} />
        {extra?.(values)}
        <button type="submit" className="hidden" />
      </form>
    </Panel>
  )
}
