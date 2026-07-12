import { History, Home, Settings, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Desktop: top navigation (>= 768px). */}
      <header className="sticky top-0 z-10 hidden border-b bg-background/95 backdrop-blur md:block">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
          <span className="mr-4 font-semibold tracking-tight">Cat Tracker</span>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* overflow-x-clip: a long unbroken cat name (or any stray-wide child)
          is clipped here instead of scrolling the whole page sideways at 375pt.
          Wide content that must be seen (tables, charts) keeps its own
          overflow-x-auto, which scrolls inside this boundary. */}
      <main className="mx-auto max-w-5xl overflow-x-clip px-4 pt-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile: bottom tab bar (< 768px), thumb-reachable. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
