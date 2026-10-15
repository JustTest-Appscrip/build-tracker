import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Copy, ExternalLink, MessagesSquare, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BuildForm } from '@/components/builds/build-form'
import {
  DistributionBadge,
  EnvironmentBadge,
  PlatformBadge,
} from '@/components/common/environment-badge'
import { EmptyState } from '@/components/common/empty-state'
import { PageSkeleton } from '@/components/common/loading-block'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/auth-context'
import { deleteBuild, getBuild, updateBuild } from '@/lib/api'
import {
  displayDistribution,
  displayPlatform,
  displayUser,
  formatTeamsShare,
} from '@/lib/display'
import { formatDateTime, safeExternalUrl } from '@/lib/utils'
import type { BuildFormValues, BuildWithProject } from '@/types/database'

export function BuildDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, configured } = useAuth()
  const [loading, setLoading] = useState(true)
  const [build, setBuild] = useState<BuildWithProject | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function refresh() {
    const data = await getBuild(id)
    setBuild(data)
  }

  useEffect(() => {
    if (!configured || !id) {
      setLoading(false)
      return
    }
    let mounted = true
    refresh()
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [configured, id])

  if (loading) return <PageSkeleton />
  if (!build) {
    return (
      <EmptyState
        icon={ExternalLink}
        title="Build not found"
        description="This build may have been deleted or you may not have access."
        actionLabel="Build history"
        onAction={() => navigate('/builds')}
      />
    )
  }

  const current = build
  const url = safeExternalUrl(current.build_link)
  const canEdit = Boolean(user && (current.created_by === user.id || isAdmin))
  const canDelete = isAdmin

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(current.build_link)
      toast.success('Build link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  async function copyForTeams() {
    try {
      await navigator.clipboard.writeText(
        formatTeamsShare(current, current.project?.name ?? 'Project'),
      )
      toast.success('Copied for Teams')
    } catch {
      toast.error('Could not copy for Teams')
    }
  }

  async function handleUpdate(values: BuildFormValues) {
    if (!user) throw new Error('Not signed in')
    const updated = await updateBuild(current.id, values, user.id)
    toast.success('Build updated')
    setEditOpen(false)
    await refresh()
    return updated
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteBuild(current.id)
      toast.success('Build deleted')
      navigate(current.project_id ? `/projects/${current.project_id}` : '/builds')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link to={`/projects/${build.project_id}`} className="hover:text-primary">
              {build.project?.name ?? 'Project'}
            </Link>
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            v{build.version}
            {build.build_number ? (
              <span className="ml-2 text-xl font-normal text-muted-foreground">
                #{build.build_number}
              </span>
            ) : null}
          </h2>
          <div className="flex flex-wrap gap-2">
            <EnvironmentBadge build={build} />
            <PlatformBadge value={displayPlatform(build)} />
            <DistributionBadge value={displayDistribution(build)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {url ? (
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Open Build
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={copyLink}>
            <Copy />
            Copy Link
          </Button>
          <Button type="button" variant="outline" onClick={copyForTeams}>
            <MessagesSquare />
            Copy for Teams
          </Button>
          {canEdit ? (
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={deleting}>
                  <Trash2 />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this build?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the build record. The external distribution link is
                    not deleted from its original platform.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {deleting ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build details</CardTitle>
          <CardDescription>
            Saving a link does not grant permission to access the original distribution platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <DetailRow label="Build link">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary hover:underline"
              >
                {build.build_link}
              </a>
            ) : (
              <span className="break-all">{build.build_link}</span>
            )}
          </DetailRow>
          <Separator />
          <DetailRow label="Notes">{build.notes || '—'}</DetailRow>
          <DetailRow label="Extra details">{build.extra_details || '—'}</DetailRow>
          <Separator />
          <DetailRow label="Added by">{displayUser(build.creator)}</DetailRow>
          <DetailRow label="Created">{formatDateTime(build.created_at)}</DetailRow>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit build</DialogTitle>
          </DialogHeader>
          <BuildForm
            submitLabel="Save changes"
            initialValues={{
              project_id: build.project_id,
              version: build.version,
              build_link: build.build_link,
              environment: build.environment ?? '',
              custom_environment: build.custom_environment ?? '',
              platform: build.platform ?? '',
              custom_platform: build.custom_platform ?? '',
              build_number: build.build_number ?? '',
              distribution_type: build.distribution_type ?? '',
              custom_distribution_type: build.custom_distribution_type ?? '',
              notes: build.notes ?? '',
              extra_details: build.extra_details ?? '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-foreground">{children}</dd>
    </div>
  )
}
