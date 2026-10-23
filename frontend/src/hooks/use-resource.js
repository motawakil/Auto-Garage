import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { showApiError } from '@/lib/api'

export function useList(resource, params = {}, options = {}) {
  return useQuery({
    queryKey: [resource.key, 'list', params],
    queryFn: () => resource.list(params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

/** Convenience for selects and small lookups: unpaginated array. */
export function useOptions(resource, params = {}, options = {}) {
  const q = useList(resource, { page_size: 500, ...params }, options)
  return { ...q, data: q.data?.results ?? [] }
}

export function useItem(resource, id, options = {}) {
  return useQuery({
    queryKey: [resource.key, 'item', String(id)],
    queryFn: () => resource.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useInvalidate() {
  const qc = useQueryClient()
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
}

/** Create or update depending on the presence of an id. Invalidates the resource and related keys. */
export function useSave(resource, { related = [], success, onSuccess, onError, params } = {}) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (vars) => {
      if (vars instanceof FormData) {
        const id = vars.get('id')
        vars.delete('id')
        return id ? resource.update(id, vars, params) : resource.create(vars, params)
      }
      const { id, ...data } = vars
      return id ? resource.update(id, data, params) : resource.create(data, params)
    },
    onSuccess: (data, vars) => {
      invalidate(resource.key, 'dashboard', 'notifications', ...related)
      if (success !== false) toast.success(success || (vars.id ? 'Modifications enregistrées' : 'Création réussie'))
      onSuccess?.(data, vars)
    },
    onError: (err, vars) => (onError ? onError(err, vars) : showApiError(err)),
  })
}

export function useRemove(resource, { related = [], onSuccess } = {}) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id) => resource.remove(id),
    onSuccess: (data, id) => {
      invalidate(resource.key, 'dashboard', 'notifications', ...related)
      toast.success('Élément supprimé')
      onSuccess?.(data, id)
    },
    onError: (err) => showApiError(err),
  })
}

export function useAction(resource, name, { related = [], success, onSuccess, method } = {}) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...data } = {}) => resource.action(id, name, data, method),
    onSuccess: (data, vars) => {
      invalidate(resource.key, 'dashboard', 'notifications', ...related)
      if (success) toast.success(success)
      onSuccess?.(data, vars)
    },
    onError: (err) => showApiError(err),
  })
}
