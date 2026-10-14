import { useEffect, useState } from 'react'
import { Download, Smartphone, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'
import { listAllProfiles, updateProfilePrivileges } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { Profile, UserRole } from '@/types/database'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function SettingsPage() {
  const { profile, user, isAdmin, signOut, configured, refreshProfile } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [users, setUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin || !configured) return
    let mounted = true
    setLoadingUsers(true)
    listAllProfiles()
      .then((rows) => {
        if (mounted) setUsers(rows)
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (mounted) setLoadingUsers(false)
      })
    return () => {
      mounted = false
    }
  }, [isAdmin, configured])

  async function handleInstall() {
    if (!deferredPrompt) {
      toast.message('Install is managed by your browser', {
        description:
          'On supported browsers, use the install icon in the address bar or Add to Home Screen.',
      })
      return
    }
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      toast.success('Install started')
    }
    setDeferredPrompt(null)
  }

  async function patchUser(
    id: string,
    patch: { approved?: boolean; role?: UserRole },
  ) {
    if (id === user?.id && patch.role === 'member') {
      toast.error('You cannot demote your own admin role from the UI.')
      return
    }
    setSavingId(id)
    try {
      const updated = await updateProfilePrivileges(id, patch)
      setUsers((prev) => prev.map((p) => (p.id === id ? updated : p)))
      if (id === user?.id) await refreshProfile()
      toast.success('User updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your signed-in identity and role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={profile?.full_name || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Role" value={isAdmin ? 'Admin' : 'Member'} />
          <Row label="Approved" value={profile?.approved ? 'Yes' : 'No'} />
          <Row label="Supabase" value={configured ? 'Configured' : 'Missing env vars'} />
          <Separator />
          <Button
            variant="outline"
            onClick={async () => {
              await signOut()
              toast.success('Signed out')
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>
              All signed-up profiles. New accounts are auto-approved. Role and approval changes are
              enforced by RLS — members cannot elevate themselves.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingUsers ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No profiles found.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {users.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        {row.full_name || 'Unnamed'}{' '}
                        {row.id === user?.id ? (
                          <span className="text-xs font-normal text-muted-foreground">(you)</span>
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{row.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDateTime(row.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={row.approved ? 'success' : 'warning'}>
                        {row.approved ? 'Approved' : 'Not approved'}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingId === row.id}
                        onClick={() => patchUser(row.id, { approved: !row.approved })}
                      >
                        {row.approved ? 'Revoke' : 'Approve'}
                      </Button>
                      <Select
                        value={row.role}
                        onValueChange={(v) => patchUser(row.id, { role: v as UserRole })}
                        disabled={savingId === row.id}
                      >
                        <SelectTrigger className="w-[8.5rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Install as app (PWA)
          </CardTitle>
          <CardDescription>
            Build Tracker can be installed for quick access. Fresh build data always requires an
            internet connection — private links are not cached offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Status: {online ? 'Online' : 'Offline'} ·{' '}
            {deferredPrompt ? 'Install prompt available' : 'Use browser install controls'}
          </p>
          <Button type="button" onClick={handleInstall}>
            <Download />
            Install guidance
          </Button>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Chrome / Edge: use Install app from the address bar or browser menu.</li>
            <li>iOS Safari: Share → Add to Home Screen.</li>
            <li>Android Chrome: Install app / Add to Home screen.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
