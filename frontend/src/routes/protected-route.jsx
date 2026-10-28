import { ShieldAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { LogoMark } from '@/components/layout/logo'
import { useAuth } from '@/context/auth-provider'

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-sidebar">
      <LogoMark className="size-12 animate-pulse" />
      <p className="text-sm text-white/50">Chargement de votre espace…</p>
    </div>
  )
}

/** Requires a session; optionally a permission code (e.g. `settings.view`). */
export function ProtectedRoute({ permission, children }) {
  const { status, can } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (status !== 'authenticated') {
    return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  if (!can(permission)) {
    return <EmptyState icon={ShieldAlert} title="Accès non autorisé" description="Votre rôle ne permet pas d’ouvrir cette page. Contactez l’administrateur de votre garage." />
  }
  return children ?? <Outlet />
}

/** Only an internal path (no protocol-relative URL) is accepted as post-login destination. */
export function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export function PublicOnlyRoute({ children }) {
  const { status } = useAuth()
  const [params] = useSearchParams()
  if (status === 'loading') return <FullScreenLoader />
  return status === 'authenticated' ? <Navigate to={safeNext(params.get('suite'))} replace /> : children
}
