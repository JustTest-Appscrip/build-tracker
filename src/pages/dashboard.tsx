import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderKanban, PackagePlus, PlusCircle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { BuildCard } from '@/components/builds/build-card'
import { EmptyState } from '@/components/common/empty-state'
import { PageSkeleton } from '@/components/common/loading-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { getDashboardStats } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { BuildWithProject, ProjectWithLatestBuild } from '@/types/database'

export function DashboardPage() {
  const { profile, user, configured } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(0)
  const [buildCount, setBuildCount] = useState(0)
  const [recentBuilds, setRecentBuilds] = useState<BuildWithProject[]>([])
  const [projects, setProjects] = useState<ProjectWithLatestBuild[]>([])
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    getDashboardStats()
      .then((data) => {
        if (!mounted) return
        setProjectCount(data.projectCount)
        setBuildCount(data.buildCount)
        setRecentBuilds(data.recentBuilds)
        setProjects(data.projectsWithLatest)
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [configured])

  const filteredRecent = useMemo(() => {
    return recentBuilds.filter((build) => {
      const matchesProject =
        selectedProject === 'all' || build.project_id === selectedProject
      const q = search.trim().toLowerCase()
      if (!q) return matchesProject
      const haystack = [
        build.project?.name,
        build.version,
        build.build_number,
        build.notes,
        build.build_link,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return matchesProject && haystack.includes(q)
    })
  }, [recentBuilds, search, selectedProject])

  if (loading) return <PageSkeleton />

  if (!configured) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Connect Supabase to get started"
        description="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, apply the SQL migration, then refresh."
      />
    )
  }

  if (projectCount === 0) {
    return (
      <div className="space-y-6">
        <WelcomeHeader name={profile?.full_name || user?.email} />
        <EmptyState
          icon={FolderKanban}
          title="Create your first project"
          description="Projects group build links for an app. After you create a project, publish a build with a version and distribution URL so QA can find it instantly."
          actionLabel="Create project"
          onAction={() => navigate('/projects')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <WelcomeHeader name={profile?.full_name || user?.email} />
        <Button asChild>
          <Link to="/builds/new">
            <PlusCircle />
            Add Build
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active projects</CardDescription>
            <CardTitle className="text-3xl">{projectCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total builds</CardDescription>
            <CardTitle className="text-3xl">{buildCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search projects and builds…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Latest build per project
          </h2>
          <p className="text-xs text-muted-foreground">Latest = most recently created</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {projects
            .filter((p) => selectedProject === 'all' || p.id === selectedProject)
            .map((project) => (
              <Card key={project.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link to={`/projects/${project.id}`} className="hover:text-primary">
                      {project.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {project.build_count ?? 0} build{(project.build_count ?? 0) === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.latest_build ? (
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">v{project.latest_build.version}</span>
                        {project.latest_build.build_number
                          ? ` · #${project.latest_build.build_number}`
                          : ''}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDateTime(project.latest_build.created_at)}
                      </p>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/builds/${project.latest_build.id}`}>View build</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">No builds yet</p>
                      <Button asChild size="sm">
                        <Link to={`/builds/new?project=${project.id}`}>Add first build</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Recent builds
        </h2>
        {filteredRecent.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title="No matching builds"
            description="Try another search, or publish a new build for QA to pick up."
            actionLabel="Add Build"
            onAction={() => navigate('/builds/new')}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredRecent.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function WelcomeHeader({ name }: { name?: string | null }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Welcome back</p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
        {name || 'Team'}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Find the newest builds without digging through chat threads.
      </p>
    </div>
  )
}
