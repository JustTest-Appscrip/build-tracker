import { Badge } from '@/components/ui/badge'
import { displayEnvironment } from '@/lib/display'
import type { Build } from '@/types/database'

const ENV_VARIANT: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'production' | 'outline'
> = {
  Development: 'info',
  QA: 'warning',
  Staging: 'default',
  Production: 'production',
  UAT: 'secondary',
  Demo: 'success',
  Other: 'outline',
}

export function EnvironmentBadge({
  build,
}: {
  build: Pick<Build, 'environment' | 'custom_environment'>
}) {
  const label = displayEnvironment(build)
  if (label === '—') return null
  const variant = ENV_VARIANT[build.environment ?? ''] ?? 'outline'
  return <Badge variant={variant}>{label}</Badge>
}

export function PlatformBadge({ value }: { value: string }) {
  if (!value || value === '—') return null
  return <Badge variant="secondary">{value}</Badge>
}

export function DistributionBadge({ value }: { value: string }) {
  if (!value || value === '—') return null
  return <Badge variant="outline">{value}</Badge>
}
