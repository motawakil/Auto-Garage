import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

export function useGarageSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings/').then((r) => r.data), staleTime: 300_000 })
}
