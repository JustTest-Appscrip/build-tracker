import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/auth-context'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function SettingsPage() {
  const { profile, user, isAdmin, signOut, configured } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Admin notes</CardTitle>
          <CardDescription>
            Roles and approvals are enforced by Supabase RLS, not only the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Approve users and grant admin with SQL in the Supabase SQL Editor. Users cannot elevate
            their own role through the client.
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`update public.profiles
set approved = true, role = 'admin'
where email = 'you@company.com';`}
          </pre>
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
