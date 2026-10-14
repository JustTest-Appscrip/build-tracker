import { X } from 'lucide-react'
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
import { DISTRIBUTION_TYPES, ENVIRONMENTS, PLATFORMS } from '@/lib/constants'
import { EMPTY_BUILD_FILTERS, type BuildFilters, type Project } from '@/types/database'

interface BuildFiltersBarProps {
  filters: BuildFilters
  projects: Project[]
  total: number
  onChange: (filters: BuildFilters) => void
}

export function BuildFiltersBar({
  filters,
  projects,
  total,
  onChange,
}: BuildFiltersBarProps) {
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'search' && Boolean(value),
  ) || Boolean(filters.search)

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold">
            Filters
          </h2>
          <p className="text-xs text-muted-foreground">
            {total} matching build{total === 1 ? '' : 's'} · latest = most recently created
          </p>
        </div>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_BUILD_FILTERS)}
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
          <Label htmlFor="build-search">Search</Label>
          <Input
            id="build-search"
            placeholder="Version, build number, notes, or link"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select
            value={filters.project_id || 'all'}
            onValueChange={(v) =>
              onChange({ ...filters, project_id: v === 'all' ? '' : v })
            }
          >
            <SelectTrigger>
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
        </div>

        <div className="space-y-1.5">
          <Label>Environment</Label>
          <Select
            value={filters.environment || 'all'}
            onValueChange={(v) =>
              onChange({ ...filters, environment: v === 'all' ? '' : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ENVIRONMENTS.map((env) => (
                <SelectItem key={env} value={env}>
                  {env}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Platform</Label>
          <Select
            value={filters.platform || 'all'}
            onValueChange={(v) =>
              onChange({ ...filters, platform: v === 'all' ? '' : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PLATFORMS.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Distribution</Label>
          <Select
            value={filters.distribution_type || 'all'}
            onValueChange={(v) =>
              onChange({ ...filters, distribution_type: v === 'all' ? '' : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {DISTRIBUTION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date-from">From</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date-to">To</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.date_to}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
