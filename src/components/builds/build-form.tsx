import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DISTRIBUTION_TYPES, ENVIRONMENTS, PLATFORMS } from '@/lib/constants'
import { createProject, listActiveProjects } from '@/lib/api'
import { validateBuildLink, validateProjectName, validateRequired } from '@/lib/validations'
import { useAuth } from '@/contexts/auth-context'
import {
  EMPTY_BUILD_FORM,
  EMPTY_PROJECT_FORM,
  type Build,
  type BuildFormValues,
  type Project,
} from '@/types/database'

interface BuildFormProps {
  initialValues?: Partial<BuildFormValues>
  submitLabel?: string
  onSubmit: (values: BuildFormValues) => Promise<Build | void>
  onCancel?: () => void
}

export function BuildForm({
  initialValues,
  submitLabel = 'Publish Build',
  onSubmit,
  onCancel,
}: BuildFormProps) {
  const { user } = useAuth()
  const [values, setValues] = useState<BuildFormValues>({
    ...EMPTY_BUILD_FORM,
    ...initialValues,
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState(EMPTY_PROJECT_FORM)
  const [creatingProject, setCreatingProject] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')

  useEffect(() => {
    let mounted = true
    listActiveProjects()
      .then((data) => {
        if (mounted) setProjects(data)
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (mounted) setLoadingProjects(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  function setField<K extends keyof BuildFormValues>(key: K, value: BuildFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    const projectError = validateRequired(values.project_id, 'Project')
    const versionError = validateRequired(values.version, 'Version')
    const linkError = validateBuildLink(values.build_link)
    if (projectError) next.project_id = projectError
    if (versionError) next.version = versionError
    if (linkError) next.build_link = linkError
    if (values.environment === 'Other' && !values.custom_environment.trim()) {
      next.custom_environment = 'Enter a custom environment name.'
    }
    if (values.platform === 'Other' && !values.custom_platform.trim()) {
      next.custom_platform = 'Enter a custom platform name.'
    }
    if (values.distribution_type === 'Other' && !values.custom_distribution_type.trim()) {
      next.custom_distribution_type = 'Enter a custom distribution type.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || saving) return
    setSaving(true)
    try {
      await onSubmit({
        ...values,
        build_link: values.build_link.trim(),
        version: values.version.trim(),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save build')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateProject() {
    if (!user) return
    const nameError = validateProjectName(newProject.name)
    if (nameError) {
      toast.error(nameError)
      return
    }
    setCreatingProject(true)
    try {
      const project = await createProject(newProject, user.id)
      setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)))
      setField('project_id', project.id)
      setProjectDialogOpen(false)
      setNewProject(EMPTY_PROJECT_FORM)
      toast.success(`Project “${project.name}” created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()),
  )

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="project">Project *</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Search projects…"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                disabled={loadingProjects}
              />
              <Select
                value={values.project_id || undefined}
                onValueChange={(v) => setField('project_id', v)}
                disabled={loadingProjects}
              >
                <SelectTrigger id="project" aria-invalid={Boolean(errors.project_id)}>
                  <SelectValue placeholder={loadingProjects ? 'Loading…' : 'Select a project'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="sm:self-end"
              onClick={() => setProjectDialogOpen(true)}
            >
              Create new project
            </Button>
          </div>
          {errors.project_id ? (
            <p className="text-sm text-destructive">{errors.project_id}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              placeholder="2.4.1"
              value={values.version}
              onChange={(e) => setField('version', e.target.value)}
              aria-invalid={Boolean(errors.version)}
            />
            {errors.version ? <p className="text-sm text-destructive">{errors.version}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="build_number">Build number</Label>
            <Input
              id="build_number"
              placeholder="108"
              value={values.build_number}
              onChange={(e) => setField('build_number', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="build_link">Build link *</Label>
          <Input
            id="build_link"
            type="url"
            placeholder="https://…"
            value={values.build_link}
            onChange={(e) => setField('build_link', e.target.value)}
            aria-invalid={Boolean(errors.build_link)}
          />
          {errors.build_link ? (
            <p className="text-sm text-destructive">{errors.build_link}</p>
          ) : (
            <p className="text-xs text-muted-foreground">HTTP or HTTPS URLs only.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={values.environment || undefined}
              onValueChange={(v) => setField('environment', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((env) => (
                  <SelectItem key={env} value={env}>
                    {env}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {values.environment === 'Other' ? (
              <Input
                placeholder="Custom environment"
                value={values.custom_environment}
                onChange={(e) => setField('custom_environment', e.target.value)}
              />
            ) : null}
            {errors.custom_environment ? (
              <p className="text-sm text-destructive">{errors.custom_environment}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={values.platform || undefined}
              onValueChange={(v) => setField('platform', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {values.platform === 'Other' ? (
              <Input
                placeholder="Custom platform"
                value={values.custom_platform}
                onChange={(e) => setField('custom_platform', e.target.value)}
              />
            ) : null}
            {errors.custom_platform ? (
              <p className="text-sm text-destructive">{errors.custom_platform}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Distribution</Label>
            <Select
              value={values.distribution_type || undefined}
              onValueChange={(v) => setField('distribution_type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {DISTRIBUTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {values.distribution_type === 'Other' ? (
              <Input
                placeholder="Custom distribution"
                value={values.custom_distribution_type}
                onChange={(e) => setField('custom_distribution_type', e.target.value)}
              />
            ) : null}
            {errors.custom_distribution_type ? (
              <p className="text-sm text-destructive">{errors.custom_distribution_type}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes / release changes</Label>
          <Textarea
            id="notes"
            placeholder="Bug fixes, features, QA instructions…"
            value={values.notes}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra_details">Extra details</Label>
          <Textarea
            id="extra_details"
            placeholder="Optional additional context"
            value={values.extra_details}
            onChange={(e) => setField('extra_details', e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Project names must be unique (case-insensitive).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-project-name">Name *</Label>
              <Input
                id="new-project-name"
                value={newProject.name}
                onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-project-desc">Description</Label>
              <Textarea
                id="new-project-desc"
                value={newProject.description}
                onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectDialogOpen(false)}
              disabled={creatingProject}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateProject} disabled={creatingProject}>
              {creatingProject ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
