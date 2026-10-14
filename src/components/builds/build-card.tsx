import { Link } from 'react-router-dom'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  DistributionBadge,
  EnvironmentBadge,
  PlatformBadge,
} from '@/components/common/environment-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { displayDistribution, displayPlatform } from '@/lib/display'
import { formatDateTime, safeExternalUrl, truncate } from '@/lib/utils'
import type { BuildWithProject } from '@/types/database'

interface BuildCardProps {
  build: BuildWithProject
  showProject?: boolean
}

export function BuildCard({ build, showProject = true }: BuildCardProps) {
  const projectName = build.project?.name ?? 'Unknown project'
  const url = safeExternalUrl(build.build_link)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(build.build_link)
      toast.success('Build link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {showProject ? (
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {projectName}
              </p>
            ) : null}
            <CardTitle className="truncate text-base">
              <Link to={`/builds/${build.id}`} className="hover:text-primary">
                v{build.version}
                {build.build_number ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    #{build.build_number}
                  </span>
                ) : null}
              </Link>
            </CardTitle>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            {formatDateTime(build.created_at)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <EnvironmentBadge build={build} />
          <PlatformBadge value={displayPlatform(build)} />
          <DistributionBadge value={displayDistribution(build)} />
        </div>
        {build.notes ? (
          <p className="text-sm text-muted-foreground">{truncate(build.notes, 140)}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/70">No release notes</p>
        )}
        <div className="flex flex-wrap gap-2">
          {url ? (
            <Button asChild size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Open Build
              </a>
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            <Copy />
            Copy Link
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/builds/${build.id}`}>Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
