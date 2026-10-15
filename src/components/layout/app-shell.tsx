import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Settings,
  X,
} from 'lucide-react'
import { ConfigBanner } from '@/components/common/config-banner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/builds/new', label: 'Add Build', icon: PlusCircle },
  { to: '/builds', label: 'Build History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/builds/new': 'Add Build',
  '/builds': 'Build History',
  '/settings': 'Settings',
}

function pageTitle(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/projects/')) return 'Project'
  if (pathname.startsWith('/builds/')) return 'Build'
  return 'Build Tracker'
}

export function AppShell() {
  const { profile, user, signOut, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/builds?q=${encodeURIComponent(q)}` : '/builds')
    setMobileOpen(false)
  }

  function isNavActive(to: string, pathname: string) {
    if (to === '/') return pathname === '/'
    if (to === '/builds/new') return pathname === '/builds/new'
    if (to === '/builds') {
      return (
        pathname === '/builds' ||
        (pathname.startsWith('/builds/') && !pathname.startsWith('/builds/new'))
      )
    }
    if (to === '/projects') {
      return pathname === '/projects' || pathname.startsWith('/projects/')
    }
    return pathname === to || pathname.startsWith(`${to}/`)
  }

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon
        const active = isNavActive(item.to, location.pathname)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-600 hover:bg-secondary hover:text-secondary-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-dvh">
      <ConfigBanner />
      <div className="mx-auto flex min-h-dvh max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/70 bg-card/80 backdrop-blur md:flex">
          <div className="flex items-center gap-2 border-b px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-semibold">
                Build Tracker
              </p>
              <p className="text-xs text-muted-foreground">Internal IT builds</p>
            </div>
          </div>
          {navContent}
          <div className="border-t p-4">
            <Button asChild className="w-full">
              <Link to="/builds/new">
                <PlusCircle />
                Add Build
              </Link>
            </Button>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-4">
                <p className="font-[family-name:var(--font-display)] font-semibold">
                  Build Tracker
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setMobileOpen(false)}
                >
                  <X />
                </Button>
              </div>
              {navContent}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {pageTitle(location.pathname)}
                </h1>
              </div>
              {location.pathname !== '/builds/new' ? (
                <form onSubmit={submitSearch} className="hidden max-w-xs flex-1 sm:block">
                  <Input
                    placeholder="Search builds…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </form>
              ) : null}
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/builds/new">
                  <PlusCircle />
                  Add Build
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="max-w-[10rem] truncate">
                    {profile?.full_name || user?.email || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="space-y-0.5">
                      <p>{profile?.full_name || 'User'}</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {isAdmin ? 'Admin' : 'Member'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="page-enter flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>

          <div className="sticky bottom-0 border-t bg-card/95 p-3 backdrop-blur sm:hidden">
            <Button asChild className="w-full">
              <Link to="/builds/new">
                <PlusCircle />
                Add Build
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
