import { AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export function ConfigBanner() {
  const { configured, configError } = useAuth()
  if (configured) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Supabase credentials are missing</p>
          <p className="mt-0.5 text-amber-800/90">
            {configError} Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
            <code className="rounded bg-amber-100 px-1">.env</code>, add your project URL and anon
            key, then restart the dev server.
          </p>
        </div>
      </div>
    </div>
  )
}
