import { useState } from 'react'
import { Copy, Eye, EyeOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createProjectCredential,
  createProjectLink,
  deleteProjectCredential,
  deleteProjectLink,
  updateProjectCredential,
  updateProjectLink,
} from '@/lib/api'
import { safeExternalUrl } from '@/lib/utils'
import {
  EMPTY_CREDENTIAL_FORM,
  EMPTY_LINK_FORM,
  type LinkEnvironment,
  type ProjectCredential,
  type ProjectCredentialFormValues,
  type ProjectLink,
  type ProjectLinkFormValues,
} from '@/types/database'

const LINK_ENVS: LinkEnvironment[] = ['LIVE', 'DEV', 'STAG', 'Other']

function envLabel(link: ProjectLink): string {
  if (link.environment === 'Other' && link.custom_environment) return link.custom_environment
  return link.environment
}

function envVariant(env: string): 'success' | 'info' | 'warning' | 'outline' {
  if (env === 'LIVE') return 'success'
  if (env === 'DEV') return 'info'
  if (env === 'STAG') return 'warning'
  return 'outline'
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`)
  }
}

interface ProjectResourcesProps {
  projectId: string
  userId: string
  isAdmin: boolean
  links: ProjectLink[]
  credentials: ProjectCredential[]
  onChange: () => Promise<void>
}

export function ProjectResources({
  projectId,
  userId,
  isAdmin,
  links,
  credentials,
  onChange,
}: ProjectResourcesProps) {
  return (
    <div className="space-y-6">
      <PortalLinksSection
        projectId={projectId}
        userId={userId}
        isAdmin={isAdmin}
        links={links}
        onChange={onChange}
      />
      <CredentialsSection
        projectId={projectId}
        userId={userId}
        isAdmin={isAdmin}
        credentials={credentials}
        onChange={onChange}
      />
    </div>
  )
}

function PortalLinksSection({
  projectId,
  userId,
  isAdmin,
  links,
  onChange,
}: {
  projectId: string
  userId: string
  isAdmin: boolean
  links: ProjectLink[]
  onChange: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectLink | null>(null)
  const [form, setForm] = useState<ProjectLinkFormValues>(EMPTY_LINK_FORM)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_LINK_FORM)
    setOpen(true)
  }

  function openEdit(link: ProjectLink) {
    setEditing(link)
    setForm({
      name: link.name,
      url: link.url,
      environment: link.environment,
      custom_environment: link.custom_environment ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required.')
      return
    }
    if (!safeExternalUrl(form.url)) {
      toast.error('Enter a valid HTTP or HTTPS URL.')
      return
    }
    if (form.environment === 'Other' && !form.custom_environment.trim()) {
      toast.error('Enter a custom environment name.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateProjectLink(editing.id, form)
        toast.success('Portal link updated')
      } else {
        await createProjectLink(projectId, form, userId)
        toast.success('Portal link added')
      }
      setOpen(false)
      await onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProjectLink(id)
      toast.success('Portal link deleted')
      await onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Portal links</CardTitle>
          <CardDescription>
            Steady environment portals for this project (LIVE / DEV / STAG).
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus />
          Add link
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No portal links yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {links.map((link) => {
              const url = safeExternalUrl(link.url)
              const canMutate = isAdmin || link.created_by === userId
              return (
                <li
                  key={link.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{link.name}</p>
                      <Badge variant={envVariant(link.environment)}>{envLabel(link)}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{link.url}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {url ? (
                      <Button asChild size="sm">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink />
                          Open
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyText('Link', link.url)}
                    >
                      <Copy />
                      Copy
                    </Button>
                    {canMutate ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(link)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" size="sm" variant="ghost">
                              <Trash2 />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete portal link?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Removes “{link.name}” from this project. The external site is not
                                deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(link.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit portal link' : 'Add portal link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-name">Name *</Label>
              <Input
                id="link-name"
                placeholder="Customer Dispatch"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={form.environment}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, environment: v as LinkEnvironment }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_ENVS.map((env) => (
                    <SelectItem key={env} value={env}>
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.environment === 'Other' ? (
                <Input
                  placeholder="Custom environment"
                  value={form.custom_environment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, custom_environment: e.target.value }))
                  }
                />
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function CredentialsSection({
  projectId,
  userId,
  isAdmin,
  credentials,
  onChange,
}: {
  projectId: string
  userId: string
  isAdmin: boolean
  credentials: ProjectCredential[]
  onChange: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectCredential | null>(null)
  const [form, setForm] = useState<ProjectCredentialFormValues>(EMPTY_CREDENTIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_CREDENTIAL_FORM)
    setOpen(true)
  }

  function openEdit(row: ProjectCredential) {
    setEditing(row)
    setForm({
      label: row.label,
      identifier: row.identifier,
      password: row.password ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.label.trim() || !form.identifier.trim()) {
      toast.error('Label and email/phone are required.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateProjectCredential(editing.id, form)
        toast.success('Credential updated')
      } else {
        await createProjectCredential(projectId, form, userId)
        toast.success('Credential added')
      }
      setOpen(false)
      await onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProjectCredential(id)
      toast.success('Credential deleted')
      await onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Test credentials</CardTitle>
          <CardDescription>
            Internal test accounts only. Passwords are stored in plaintext for this MVP — do not
            save production secrets here.
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus />
          Add credential
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test credentials yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {credentials.map((row) => {
              const canMutate = isAdmin || row.created_by === userId
              const showPw = revealed[row.id]
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="font-medium">{row.label}</p>
                    <p className="truncate text-muted-foreground">{row.identifier}</p>
                    {row.password ? (
                      <p className="font-mono text-xs">
                        {showPw ? row.password : '••••••••'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No password saved</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyText('Email/phone', row.identifier)}
                    >
                      <Copy />
                      Copy ID
                    </Button>
                    {row.password ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRevealed((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                          }
                        >
                          {showPw ? <EyeOff /> : <Eye />}
                          {showPw ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyText('Password', row.password || '')}
                        >
                          <Copy />
                          Copy PW
                        </Button>
                      </>
                    ) : null}
                    {canMutate ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" size="sm" variant="ghost">
                              <Trash2 />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete credential?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Removes the “{row.label}” test account from this project.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(row.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit credential' : 'Add credential'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cred-label">Label *</Label>
              <Input
                id="cred-label"
                placeholder="Driver"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-id">Email or phone *</Label>
              <Input
                id="cred-id"
                placeholder="driver@example.com"
                value={form.identifier}
                onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-pw">Password (optional)</Label>
              <Input
                id="cred-pw"
                type="text"
                placeholder="Optional"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
