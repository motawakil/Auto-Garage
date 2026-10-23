import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useDebounce } from '@/hooks/use-debounce'
import { api } from '@/lib/api'

/** Live duplicate detection while typing a new client's phone or name. */
export function DuplicateHint({ values }) {
  const phone = useDebounce(values.phone || '', 400)
  const name = useDebounce(values.kind === 'company' ? values.company_name || '' : values.last_name || '', 400)
  const { data = [] } = useQuery({
    queryKey: ['clients', 'duplicates', phone, name],
    queryFn: () => api.get('/clients/duplicates/', { params: { phone, name } }).then((r) => r.data),
    enabled: !values.id && (phone.length >= 6 || name.length >= 3),
  })
  const rows = data.filter((d) => d.id !== values.id)
  if (values.id || rows.length === 0) return null
  return (
    <div className="mt-5 rounded-xl border border-amber-300/60 bg-amber-50 p-3.5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200"><AlertTriangle className="size-4" />Doublon possible</p>
      <ul className="mt-2 space-y-1">
        {rows.map((d) => (
          <li key={d.id}>
            <Link to={`/clients/${d.id}`} className="text-amber-900 underline-offset-2 hover:underline dark:text-amber-100">
              {d.display_name} · {d.phone} <span className="font-mono text-xs opacity-70">{d.code}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
