import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, FolderKanban, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/empty-state'
import { PageSkeleton } from '@/components/common/loading-block'
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
  createProject,
  listActiveProjects,
  listArchivedProjects,
} from '@/lib/api'
import { validateProjectName } from '@/lib/validations'
import { formatDateTime } from '@/lib/utils'
import { EMPTY_PROJECT_FORM, type Project } from '@/types/database'

export function ProjectsPage() {
  const { user, configured, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Project[]>([])
  const [archived, setArchived] = useState<Project[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_PROJECT_FORM)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    const [a, ar] = await Promise.all([listActiveProjects(), listArchivedProjects()])
    setActive(a)
    setArchived(ar)
  }

  useEffect(() => {
    if (!configured) {
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
  }, [configured])

  const list = showArchived ? archived : active
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) => {
      const haystack = [p.name, p.description].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [list, search])

  async function handleCreate() {
    if (!user) return
    const nameError = validateProjectName(form.name)
    if (nameError) {
      toast.error(nameError)
      return
    }
    setSaving(true)
    try {
      const project = await createProject(form, user.id)
      toast.success(`Created “${project.name}”`)
      setDialogOpen(false)
      setForm(EMPTY_PROJECT_FORM)
      await refresh()
      navigate(`/projects/${project.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {showArchived ? 'Archived projects' : 'Active projects'} · {filtered.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => setShowArchived((v) => !v)}
          >
            <Archive />
            {showArchived ? 'Show active' : 'Show archived'}
          </Button>
          {!showArchived ? (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus />
              New project
            </Button>
          ) : null}
        </div>
      </div>

      <Input
        placeholder="Search projects by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={showArchived ? 'No archived projects' : 'No projects yet'}
          description={
            showArchived
              ? 'Archived projects are hidden from the default list but keep their build history.'
              : 'Create a project, then add builds with version and distribution links for QA.'
          }
          actionLabel={showArchived ? undefined : 'Create project'}
          onAction={showArchived ? undefined : () => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((project) => (
            <Card key={project.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">
                  <Link to={`/projects/${project.id}`} className="hover:text-primary">
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {project.description || 'No description'} · Created{' '}
                  {formatDateTime(project.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/projects/${project.id}`}>Open</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={`/builds/new?project=${project.id}`}>Add Build</Link>
                </Button>
                {project.archived_at && isAdmin ? (
                  <span className="self-center text-xs text-muted-foreground">
                    Archived {formatDateTime(project.archived_at)}
                  </span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
