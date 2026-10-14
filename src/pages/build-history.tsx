import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { toast } from 'sonner'
import { BuildCard } from '@/components/builds/build-card'
import { BuildFiltersBar } from '@/components/builds/build-filters'
import { EmptyState } from '@/components/common/empty-state'
import { PageSkeleton } from '@/components/common/loading-block'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { listActiveProjects, listBuilds } from '@/lib/api'
import {
  EMPTY_BUILD_FILTERS,
  type BuildFilters,
  type BuildWithProject,
  type Project,
} from '@/types/database'

const PAGE_SIZE = 24

export function BuildHistoryPage() {
  const { configured } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [builds, setBuilds] = useState<BuildWithProject[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState<BuildFilters>(() => ({
    ...EMPTY_BUILD_FILTERS,
    search: params.get('q') ?? '',
    project_id: params.get('project') ?? '',
  }))

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    listActiveProjects()
      .then(setProjects)
      .catch((err: Error) => toast.error(err.message))
  }, [configured])

  useEffect(() => {
    if (!configured) return
    let mounted = true
    setLoading(true)
    listBuilds(filters, PAGE_SIZE, offset)
      .then((result) => {
        if (!mounted) return
        setBuilds((prev) => (offset === 0 ? result.builds : [...prev, ...result.builds]))
        setTotal(result.count)
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [configured, filters, offset])

  function handleFilterChange(next: BuildFilters) {
    setOffset(0)
    setFilters(next)
  }

  if (!configured) {
    return (
      <EmptyState
        icon={History}
        title="Connect Supabase to view history"
        description="Build history is loaded from your Supabase project."
      />
    )
  }

  return (
    <div className="space-y-6">
      <BuildFiltersBar
        filters={filters}
        projects={projects}
        total={total}
        onChange={handleFilterChange}
      />

      {loading && offset === 0 ? (
        <PageSkeleton />
      ) : builds.length === 0 ? (
        <EmptyState
          icon={History}
          title="No builds found"
          description="Adjust filters or publish a new build for the team."
          actionLabel="Add Build"
          onAction={() => navigate('/builds/new')}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {builds.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
          {builds.length < total ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                {loading ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
