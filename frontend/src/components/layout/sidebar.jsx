import { useQuery } from '@tanstack/react-query'
import { ChevronsLeft, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { LogoMark } from './logo'
import { NAV } from './nav'

export function useNotificationsCount() {
  return useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications/').then((r) => r.data), refetchInterval: 60_000 })
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { data: notifs } = useNotificationsCount()
  const counts = { notifications: notifs?.filter((n) => n.priority === 'high').length }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in lg:hidden" onClick={onMobileClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-out',
          'w-[272px] lg:translate-x-0', collapsed ? 'lg:w-[76px]' : 'lg:w-[264px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.16),transparent_65%)]" />
        <div className={cn('relative flex h-16 items-center gap-3 px-5', collapsed && 'lg:justify-center lg:px-0')}>
          <LogoMark />
          <div className={cn('min-w-0 leading-tight', collapsed && 'lg:hidden')}>
            <p className="truncate text-[15px] font-semibold tracking-tight text-white">El Jaouhari</p>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">Garage Manager</p>
          </div>
          <button onClick={onMobileClose} className="ml-auto rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-elevated hover:text-white lg:hidden">
            <X className="size-5" />
          </button>
        </div>

        <nav className="scrollbar-thin relative flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {NAV.map((section) => (
            <div key={section.group} className="mb-4">
              <p className={cn('mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted/80', collapsed && 'lg:hidden')}>
                {section.group}
              </p>
              {collapsed && <div className="mx-auto mb-2 hidden h-px w-6 bg-sidebar-border lg:block" />}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                          collapsed && 'lg:justify-center lg:px-0',
                          isActive ? 'bg-sidebar-elevated text-white' : 'hover:bg-sidebar-elevated/60 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />}
                          <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-red-400' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} strokeWidth={1.9} />
                          <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                          {item.badge && counts[item.badge] > 0 && (
                            <span className={cn('ml-auto rounded-full bg-red-500 px-1.5 text-[10.5px] font-semibold leading-[18px] text-white tabular',
                              collapsed && 'lg:absolute lg:right-1.5 lg:top-1 lg:px-1 lg:leading-[14px]')}>
                              {counts[item.badge]}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-sidebar-border p-3">
          <div className={cn('flex items-center gap-3 rounded-xl bg-sidebar-elevated/70 p-2.5', collapsed && 'lg:hidden')}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-[11px] font-semibold text-white">MVP</div>
            <div className="min-w-0 text-xs leading-tight">
              <p className="font-medium text-white">Manager 2027</p>
              <p className="truncate text-sidebar-muted">Version 0.1 · Casablanca</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className={cn('mt-2 hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-xs text-sidebar-muted hover:bg-sidebar-elevated hover:text-white lg:flex')}
          >
            <ChevronsLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
            <span className={cn(collapsed && 'hidden')}>Réduire le menu</span>
          </button>
        </div>
      </aside>
    </>
  )
}
