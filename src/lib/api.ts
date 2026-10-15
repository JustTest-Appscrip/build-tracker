import { getSupabase, missingConfigMessage } from '@/lib/supabase'
import type {
  Build,
  BuildFilters,
  BuildFormValues,
  BuildWithProject,
  Profile,
  Project,
  ProjectCredential,
  ProjectCredentialFormValues,
  ProjectFormValues,
  ProjectLink,
  ProjectLinkFormValues,
  ProjectWithLatestBuild,
  UserRole,
} from '@/types/database'

function requireClient() {
  try {
    return getSupabase()
  } catch {
    throw new Error(missingConfigMessage)
  }
}

function normalizeBuildPayload(values: BuildFormValues, userId: string) {
  return {
    project_id: values.project_id,
    version: values.version.trim(),
    build_link: values.build_link.trim(),
    environment: values.environment || null,
    custom_environment:
      values.environment === 'Other' ? values.custom_environment.trim() || null : null,
    platform: values.platform || null,
    custom_platform:
      values.platform === 'Other' ? values.custom_platform.trim() || null : null,
    build_number: values.build_number.trim() || null,
    distribution_type: values.distribution_type || null,
    custom_distribution_type:
      values.distribution_type === 'Other'
        ? values.custom_distribution_type.trim() || null
        : null,
    notes: values.notes.trim() || null,
    extra_details: values.extra_details.trim() || null,
    created_by: userId,
  }
}

export async function listProjects(options?: {
  includeArchived?: boolean
  search?: string
}): Promise<Project[]> {
  const supabase = requireClient()
  let query = supabase.from('projects').select('*').order('name', { ascending: true })

  if (!options?.includeArchived) {
    query = query.is('archived_at', null)
  } else if (options.includeArchived === true) {
    // return all; caller may filter
  }

  if (options?.search?.trim()) {
    query = query.ilike('name', `%${options.search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function listActiveProjects(): Promise<Project[]> {
  return listProjects({ includeArchived: false })
}

export async function listArchivedProjects(): Promise<Project[]> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as Project | null
}

export async function createProject(
  values: ProjectFormValues,
  userId: string,
): Promise<Project> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: values.name.trim(),
      description: values.description.trim() || null,
      created_by: userId,
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('A project with this name already exists.')
    }
    throw error
  }
  return data as Project
}

export async function updateProject(
  id: string,
  values: ProjectFormValues,
): Promise<Project> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: values.name.trim(),
      description: values.description.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('A project with this name already exists.')
    }
    throw error
  }
  return data as Project
}

export async function archiveProject(id: string): Promise<Project> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Project
}

export async function unarchiveProject(id: string): Promise<Project> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('projects')
    .update({ archived_at: null })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Project
}

export async function getProjectsWithLatestBuilds(): Promise<ProjectWithLatestBuild[]> {
  const projects = await listActiveProjects()
  if (projects.length === 0) return []

  const supabase = requireClient()
  const ids = projects.map((p) => p.id)
  const { data: builds, error } = await supabase
    .from('builds')
    .select('*')
    .in('project_id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error

  const latestByProject = new Map<string, Build>()
  const counts = new Map<string, number>()
  for (const build of (builds ?? []) as Build[]) {
    counts.set(build.project_id, (counts.get(build.project_id) ?? 0) + 1)
    if (!latestByProject.has(build.project_id)) {
      latestByProject.set(build.project_id, build)
    }
  }

  return projects.map((project) => ({
    ...project,
    latest_build: latestByProject.get(project.id) ?? null,
    build_count: counts.get(project.id) ?? 0,
  }))
}

export async function listBuilds(
  filters: Partial<BuildFilters> = {},
  limit = 50,
  offset = 0,
): Promise<{ builds: BuildWithProject[]; count: number }> {
  const supabase = requireClient()
  let query = supabase
    .from('builds')
    .select('*, project:projects(*), creator:profiles!builds_created_by_fkey(id, email, full_name)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }
  if (filters.environment) {
    query = query.eq('environment', filters.environment)
  }
  if (filters.platform) {
    query = query.eq('platform', filters.platform)
  }
  if (filters.distribution_type) {
    query = query.eq('distribution_type', filters.distribution_type)
  }
  if (filters.date_from) {
    query = query.gte('created_at', new Date(filters.date_from).toISOString())
  }
  if (filters.date_to) {
    const end = new Date(filters.date_to)
    end.setHours(23, 59, 59, 999)
    query = query.lte('created_at', end.toISOString())
  }
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`
    query = query.or(
      `version.ilike.${q},build_number.ilike.${q},notes.ilike.${q},build_link.ilike.${q}`,
    )
  }

  const { data, error, count } = await query
  if (error) throw error
  return {
    builds: (data ?? []) as BuildWithProject[],
    count: count ?? 0,
  }
}

export async function getBuild(id: string): Promise<BuildWithProject | null> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('builds')
    .select('*, project:projects(*), creator:profiles!builds_created_by_fkey(id, email, full_name)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as BuildWithProject | null
}

export async function createBuild(
  values: BuildFormValues,
  userId: string,
): Promise<Build> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('builds')
    .insert(normalizeBuildPayload(values, userId))
    .select('*')
    .single()
  if (error) throw error
  return data as Build
}

export async function updateBuild(
  id: string,
  values: BuildFormValues,
  userId: string,
): Promise<Build> {
  const supabase = requireClient()
  const payload = normalizeBuildPayload(values, userId)
  // Do not allow changing created_by on update
  const { created_by: _createdBy, ...updatePayload } = payload
  void _createdBy
  const { data, error } = await supabase
    .from('builds')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Build
}

export async function deleteBuild(id: string): Promise<void> {
  const supabase = requireClient()
  const { error } = await supabase.from('builds').delete().eq('id', id)
  if (error) throw error
}

export async function getDashboardStats(): Promise<{
  projectCount: number
  buildCount: number
  recentBuilds: BuildWithProject[]
  projectsWithLatest: ProjectWithLatestBuild[]
}> {
  const supabase = requireClient()

  const [projectsRes, buildsCountRes, recentRes, projectsWithLatest] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null),
    supabase.from('builds').select('id', { count: 'exact', head: true }),
    supabase
      .from('builds')
      .select('*, project:projects(*), creator:profiles!builds_created_by_fkey(id, email, full_name)')
      .order('created_at', { ascending: false })
      .limit(8),
    getProjectsWithLatestBuilds(),
  ])

  if (projectsRes.error) throw projectsRes.error
  if (buildsCountRes.error) throw buildsCountRes.error
  if (recentRes.error) throw recentRes.error

  return {
    projectCount: projectsRes.count ?? 0,
    buildCount: buildsCountRes.count ?? 0,
    recentBuilds: (recentRes.data ?? []) as BuildWithProject[],
    projectsWithLatest,
  }
}

export async function listAllProfiles(): Promise<Profile[]> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function updateProfilePrivileges(
  id: string,
  patch: { approved?: boolean; role?: UserRole },
): Promise<Profile> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(patch.approved !== undefined ? { approved: patch.approved } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function listProjectLinks(projectId: string): Promise<ProjectLink[]> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('project_links')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ProjectLink[]
}

export async function createProjectLink(
  projectId: string,
  values: ProjectLinkFormValues,
  userId: string,
): Promise<ProjectLink> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('project_links')
    .insert({
      project_id: projectId,
      name: values.name.trim(),
      url: values.url.trim(),
      environment: values.environment,
      custom_environment:
        values.environment === 'Other' ? values.custom_environment.trim() || null : null,
      created_by: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as ProjectLink
}

export async function updateProjectLink(
  id: string,
  values: ProjectLinkFormValues,
): Promise<ProjectLink> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('project_links')
    .update({
      name: values.name.trim(),
      url: values.url.trim(),
      environment: values.environment,
      custom_environment:
        values.environment === 'Other' ? values.custom_environment.trim() || null : null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as ProjectLink
}

export async function deleteProjectLink(id: string): Promise<void> {
  const supabase = requireClient()
  const { error } = await supabase.from('project_links').delete().eq('id', id)
  if (error) throw error
}

export async function listProjectCredentials(
  projectId: string,
): Promise<ProjectCredential[]> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('project_credentials')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ProjectCredential[]
}

export async function createProjectCredential(
  projectId: string,
  values: ProjectCredentialFormValues,
  userId: string,
): Promise<ProjectCredential> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('project_credentials')
    .insert({
      project_id: projectId,
      label: values.label.trim(),
      identifier: values.identifier.trim(),
      password: values.password.trim() || null,
      created_by: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as ProjectCredential
}

export async function updateProjectCredential(
  id: string,
  values: ProjectCredentialFormValues,
): Promise<ProjectCredential> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('project_credentials')
    .update({
      label: values.label.trim(),
      identifier: values.identifier.trim(),
      password: values.password.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as ProjectCredential
}

export async function deleteProjectCredential(id: string): Promise<void> {
  const supabase = requireClient()
  const { error } = await supabase.from('project_credentials').delete().eq('id', id)
  if (error) throw error
}
