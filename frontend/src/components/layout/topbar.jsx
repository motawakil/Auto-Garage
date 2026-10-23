import { Bell, ChevronDown, Menu, Moon, Plus, Search, Settings, Sun } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MenuItem, Popover } from '@/components/ui/popover'
import { useTheme } from '@/context/theme-provider'
import { cn } from '@/lib/utils'
import { useNotificationsCount } from './sidebar'

const PRIORITY_DOT = { high: 'bg-red-500', normal: 'bg-amber-500', low: 'bg-emerald-500' }

export function Topbar({ onMenu, onSearch }) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const { data: notifs = [] } = useNotificationsCount()
  const high = notifs.filter((n) => n.priority === 'high').length
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button variant="ghost" size="icon" icon={Menu} className="lg:hidden" onClick={onMenu} aria-label="Menu" />

      <button
        onClick={onSearch}
        className="group flex h-10 flex-1 items-center gap-3 rounded-xl border border-border bg-card px-3.5 text-sm text-muted-foreground shadow-card transition-colors hover:border-input md:max-w-md cursor-pointer"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">
          <span className="hidden sm:inline">Rechercher un client, une immatriculation, un dossier…</span>
          <span className="sm:hidden">Rechercher…</span>
        </span>
        <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium sm:block">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="primary" icon={Plus} className="hidden md:inline-flex" onClick={() => navigate('/dossiers?new=1')}>Nouveau dossier</Button>
        <Button variant="ghost" size="icon" icon={theme === 'dark' ? Sun : Moon} onClick={toggle} aria-label="Thème" />

        <Popover
          className="w-[min(380px,calc(100vw-2rem))]"
          trigger={({ toggle: t }) => (
            <button onClick={t} className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {notifs.length > 0 && (
                <span className={cn('absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-background tabular', high ? 'bg-red-500' : 'bg-amber-500')}>
                  {notifs.length > 99 ? '99+' : notifs.length}
                </span>
              )}
            </button>
          )}
        >
          {({ close }) => (
            <div>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="font-semibold">Notifications</p>
                <span className="text-xs text-muted-foreground">{high} prioritaire{high > 1 ? 's' : ''}</span>
              </div>
              <div className="scrollbar-thin max-h-96 overflow-y-auto p-1.5">
                {notifs.slice(0, 8).map((n) => (
                  <Link key={n.id} to={n.link} onClick={close} className="flex gap-3 rounded-lg px-2.5 py-2.5 hover:bg-muted">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PRIORITY_DOT[n.priority])} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                    </span>
                  </Link>
                ))}
                {notifs.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Tout est à jour ✓</p>}
              </div>
              <Link to="/notifications" onClick={close} className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted">
                Voir toutes les notifications
              </Link>
            </div>
          )}
        </Popover>

        <Popover
          className="w-56 p-1.5"
          trigger={({ toggle: t }) => (
            <button onClick={t} className="ml-1 flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-muted cursor-pointer">
              <Avatar name="Abdelilah Jaouhari" />
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[13px] font-semibold">A. Jaouhari</span>
                <span className="block text-[11px] text-muted-foreground">Gérant</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground xl:block" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <div className="px-2.5 py-2">
                <p className="text-sm font-semibold">Abdelilah Jaouhari</p>
                <p className="text-xs text-muted-foreground">Gérant · Accès complet</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <MenuItem icon={Settings} onClick={() => { navigate('/parametres'); close() }}>Paramètres du garage</MenuItem>
              <MenuItem icon={theme === 'dark' ? Sun : Moon} onClick={() => { toggle(); close() }}>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</MenuItem>
              <p className="px-2.5 pb-1 pt-2 text-[11px] text-muted-foreground">Authentification prévue dans la prochaine version.</p>
            </>
          )}
        </Popover>
      </div>
    </header>
  )
}
