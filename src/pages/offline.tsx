import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-6 w-6" />
          </div>
          <CardTitle>You are offline</CardTitle>
          <CardDescription>
            Build Tracker needs an internet connection to load fresh projects and build links.
            Private build data is never cached for offline use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => window.location.assign('/')}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
