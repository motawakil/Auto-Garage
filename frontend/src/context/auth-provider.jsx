import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { authApi } from '@/lib/api'

const AuthContext = createContext(null)

/**
 * Session state, modelled on Karizma One's AuthProvider: bootstraps with /auth/me, exposes
 * user / company / role / permissions and login / logout. Tokens are httpOnly cookies the JS never sees.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('loading') // loading | authenticated | anonymous
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const bootstrap = useCallback(async () => {
    try {
      await authApi.csrf()
      setSession(await authApi.me())
      setStatus('authenticated')
    } catch {
      setSession(null)
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => { bootstrap() }, [bootstrap])

  const endSession = useCallback((reason) => {
    queryClient.clear()
    setSession(null)
    setStatus('anonymous')
    navigate(reason ? `/connexion?raison=${reason}` : '/connexion', { replace: true })
  }, [navigate, queryClient])

  useEffect(() => {
    const onExpired = () => {
      if (status !== 'authenticated') return
      toast.warning('Votre session a expiré. Veuillez vous reconnecter.', { id: 'session-expired' })
      endSession('session')
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [endSession, status])

  const login = useCallback(async (credentials) => {
    await authApi.csrf()
    const data = await authApi.login(credentials)
    queryClient.clear()
    setSession(data)
    setStatus('authenticated')
    return data
  }, [queryClient])

  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { endSession() }
  }, [endSession])

  const value = useMemo(() => {
    const permissions = new Set(session?.permissions ?? [])
    return {
      status,
      isAuthenticated: status === 'authenticated',
      user: session?.user ?? null,
      company: session?.company ?? null,
      role: session?.role ?? null,
      roleLabel: session?.role_label ?? '',
      isAdmin: session?.role === 'admin',
      can: (code) => !code || permissions.has(code),
      login,
      logout,
      refresh: bootstrap,
    }
  }, [session, status, login, logout, bootstrap])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Karizma One's `useCan` / `<Can>` helpers, driven by the permission codes returned by /auth/me. */
export const useCan = (code) => useAuth().can(code)

export function Can({ permission, fallback = null, children }) {
  return useCan(permission) ? children : fallback
}
