import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { BuildCard } from '@/components/builds/build-card'
import { EmptyState } from '@/components/common/empty-state'
import { PageSkeleton } from '@/components/common/loading-block'
import { ProjectResources } from '@/components/projects/project-resources'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import {
  archiveProject,
  getProject,
  listBuilds,
  listProjectCredentials,
  listProjectLinks,
  unarchiveProject,
  updateProject,
} from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { validateProjectName } from '@/lib/validations'
import type {
  BuildWithProject,
  Project,
  ProjectCredential,
  ProjectLink,
} from '@/types/database'

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, configured } = useAuth()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [builds, setBuilds] = useState<BuildWithProject[]>([])
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [credentials, setCredentials] = useState<ProjectCredential[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    const [p, b, l, c] = await Promise.all([
      getProject(id),
      listBuilds({ project_id: id }, 100, 0),
      listProjectLinks(id).catch(() => [] as ProjectLink[]),
      listProjectCredentials(id).catch(() => [] as ProjectCredential[]),
    ])
    setProject(p)
    setBuilds(b.builds)
    setLinks(l)
    setCredentials(c)
    if (p) {
      setName(p.name)
      setDescription(p.description ?? '')
    }
  }

  async function refreshResources() {
    const [l, c] = await Promise.all([
      listProjectLinks(id),
      listProjectCredentials(id),
    ])
    setLinks(l)
    setCredentials(c)
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

  const canEdit =
    Boolean(project && user && (project.created_by === user.id || isAdmin))
  const canArchive = Boolean(project && user && (isAdmin || project.created_by === user.id))

  async function handleSave() {
    const nameError = validateProjectName(name)
    if (nameError) {
      toast.error(nameError)
      return
    }
    setSaving(true)
    try {
      const updated = await updateProject(id, { name, description })
      setProject(updated)
      setEditOpen(false)
      toast.success('Project updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    try {
      if (!isAdmin) {
        toast.error('Only admins can archive projects in this MVP.')
        return
      }
      const updated = await archiveProject(id)
      setProject(updated)
      toast.success('Project archived')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Archive failed')
    }
  }

  async function handleUnarchive() {
    try {
      if (!isAdmin) {
        toast.error('Only admins can unarchive projects.')
        return
      }
      const updated = await unarchiveProject(id)
      setProject(updated)
      toast.success('Project restored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed')
    }
  }

  if (loading) return <PageSkeleton />
  if (!project) {
    return (
      <EmptyState
        icon={Archive}
        title="Project not found"
        description="It may have been removed or you may not have access."
        actionLabel="Back to projects"
        onAction={() => navigate('/projects')}
      />
    )
  }

  const latest = builds[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Created {formatDateTime(project.created_at)}
            {project.archived_at ? ` · Archived ${formatDateTime(project.archived_at)}` : ''}
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {project.name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {project.description || 'No description provided.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/builds/new?project=${project.id}`}>Add Build</Link>
          </Button>
          {canEdit ? (
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </Button>
          ) : null}
          {canArchive && !project.archived_at && isAdmin ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Archive />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Archived projects leave the default list but keep all build history. This does
                    not permanently delete the project.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          {project.archived_at && isAdmin ? (
            <Button type="button" variant="outline" onClick={handleUnarchive}>
              Restore
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest build</CardTitle>
          <CardDescription>
            Defined as the most recently created build for this project (not by version string).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latest ? (
            <BuildCard build={latest} showProject={false} />
          ) : (
            <p className="text-sm text-muted-foreground">No builds yet for this project.</p>
          )}
        </CardContent>
      </Card>

      {user ? (
        <ProjectResources
          projectId={project.id}
          userId={user.id}
          isAdmin={isAdmin}
          links={links}
          credentials={credentials}
          onChange={refreshResources}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Build history
          </h3>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/builds?project=${project.id}`}>View all filters</Link>
          </Button>
        </div>
        {builds.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="No builds yet"
            description="Publish the first build with a version and distribution link."
            actionLabel="Add Build"
            onAction={() => navigate(`/builds/new?project=${project.id}`)}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {builds.map((build) => (
              <BuildCard key={build.id} build={build} showProject={false} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
