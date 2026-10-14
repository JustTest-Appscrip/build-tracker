import { Navigate, useLocation } from 'react-router-dom'
import { PageSkeleton } from '@/components/common/loading-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, configured, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageSkeleton />
      </div>
    )
  }

  // Without Supabase credentials, allow browsing the UI with empty/error states.
  if (!configured) {
    return <>{children}</>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profile && !profile.approved) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Awaiting approval</CardTitle>
            <CardDescription>
              Your account is signed in but not yet approved for Build Tracker access. Ask an
              admin to approve your profile in Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md bg-muted px-3 py-2 text-sm">{user.email}</p>
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
