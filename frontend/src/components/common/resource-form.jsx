import { Paperclip } from 'lucide-react'

import { Field, Input, Select, Switch, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ResourceSelect } from './resource-select'

/**
 * Schema-driven form. Field: { name, label, type, options, required, span, hint, placeholder,
 * resource, getLabel, getSubLabel, params, multiple, show(values), disabled(values) }.
 * `{ section: 'Titre' }` entries render a heading.
 */
export function ResourceForm({ fields, values, onChange, errors = {} }) {
  const set = (name, v) => onChange({ ...values, [name]: v })
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      {fields.map((f, i) => {
        if (f.section) {
          return (
            <div key={`s${i}`} className={cn('col-span-2 flex items-center gap-3', i > 0 && 'pt-2')}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{f.section}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          )
        }
        if (f.show && !f.show(values)) return null
        const v = values[f.name]
        const disabled = typeof f.disabled === 'function' ? f.disabled(values) : f.disabled
        const common = { id: f.name, 'aria-invalid': !!errors[f.name], disabled, placeholder: f.placeholder }
        let control
        switch (f.type) {
          case 'textarea':
            control = <Textarea {...common} value={v ?? ''} onChange={(e) => set(f.name, e.target.value)} />
            break
          case 'select':
            control = (
              <Select {...common} value={v ?? ''} placeholder={f.required ? undefined : f.placeholder ?? '—'} options={f.options}
                onChange={(e) => set(f.name, e.target.value)} />
            )
            break
          case 'switch':
            control = <Switch checked={!!v} onChange={(x) => set(f.name, x)} label={f.switchLabel} description={f.hint} />
            break
          case 'resource':
            control = (
              <ResourceSelect resource={f.resource} value={v ?? (f.multiple ? [] : null)} multiple={f.multiple}
                getLabel={f.getLabel} getSubLabel={f.getSubLabel} params={typeof f.params === 'function' ? f.params(values) : f.params}
                invalid={!!errors[f.name]} disabled={disabled} placeholder={f.placeholder}
                onChange={(id, row) => onChange({ ...values, [f.name]: id, ...(f.onPick ? f.onPick(row, values) : {}) })} />
            )
            break
          case 'file':
            control = (
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                <Paperclip className="size-4" />
                <span className="truncate">{v instanceof File ? v.name : v ? String(v).split('/').pop() : 'Choisir un fichier…'}</span>
                <input type="file" className="hidden" accept={f.accept} onChange={(e) => set(f.name, e.target.files?.[0] ?? null)} />
              </label>
            )
            break
          case 'color':
            control = <Input {...common} type="color" className="h-9 p-1" value={v || '#ef4444'} onChange={(e) => set(f.name, e.target.value)} />
            break
          case 'money':
          case 'number':
            control = (
              <Input {...common} type="number" step={f.step ?? (f.type === 'money' ? '0.01' : '1')} suffix={f.suffix ?? (f.type === 'money' ? 'MAD' : undefined)}
                value={v ?? ''} onChange={(e) => set(f.name, e.target.value === '' ? null : e.target.value)} className="tabular" />
            )
            break
          default:
            control = (
              <Input {...common} type={f.type || 'text'} value={v ?? ''} icon={f.icon}
                onChange={(e) => set(f.name, f.transform ? f.transform(e.target.value) : e.target.value)} />
            )
        }
        return (
          <Field key={f.name} label={f.type === 'switch' ? null : f.label} required={f.required} error={errors[f.name]}
            hint={f.type === 'switch' ? null : f.hint} htmlFor={f.name} className={f.span === 1 ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
            {control}
          </Field>
        )
      })}
    </div>
  )
}

/** Build the request body; switches to multipart when a File is present. */
export function toPayload(values, fields) {
  const names = fields.filter((f) => f.name && !f.readOnly).map((f) => f.name)
  const body = Object.fromEntries(names.filter((n) => values[n] !== undefined).map((n) => [n, values[n] === '' ? defaultEmpty(fields, n) : values[n]]))
  const fileFields = fields.filter((f) => f.type === 'file').map((f) => f.name)
  if (!fileFields.some((n) => body[n] instanceof File)) {
    fileFields.forEach((n) => delete body[n])
    return body
  }
  const fd = new FormData()
  Object.entries(body).forEach(([k, v]) => {
    if (v === null || v === undefined) return
    if (fileFields.includes(k) && !(v instanceof File)) return
    Array.isArray(v) ? v.forEach((x) => fd.append(k, x)) : fd.append(k, v)
  })
  return fd
}

function defaultEmpty(fields, name) {
  const f = fields.find((x) => x.name === name)
  return ['select', 'text', 'textarea', 'email', 'tel', undefined].includes(f?.type) && !f?.nullable ? '' : null
}
