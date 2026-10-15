import type { Build, BuildWithProject, Profile } from '@/types/database'

export function displayEnvironment(build: Pick<Build, 'environment' | 'custom_environment'>): string {
  if (build.environment === 'Other' && build.custom_environment) {
    return build.custom_environment
  }
  return build.environment || '—'
}

export function displayPlatform(build: Pick<Build, 'platform' | 'custom_platform'>): string {
  if (build.platform === 'Other' && build.custom_platform) {
    return build.custom_platform
  }
  return build.platform || '—'
}

export function displayDistribution(
  build: Pick<Build, 'distribution_type' | 'custom_distribution_type'>,
): string {
  if (build.distribution_type === 'Other' && build.custom_distribution_type) {
    return build.custom_distribution_type
  }
  return build.distribution_type || '—'
}

export function displayUser(profile?: Pick<Profile, 'email' | 'full_name'> | null): string {
  if (!profile) return 'Unknown'
  return profile.full_name?.trim() || profile.email || 'Unknown'
}

/** Teams / chat paste format for sharing a build. */
export function formatTeamsShare(
  build: Pick<
    BuildWithProject,
    | 'version'
    | 'build_number'
    | 'build_link'
    | 'environment'
    | 'custom_environment'
    | 'distribution_type'
    | 'custom_distribution_type'
    | 'notes'
    | 'project'
  >,
  projectNameFallback = 'Project',
): string {
  const projectName = build.project?.name?.trim() || projectNameFallback
  const distribution = displayDistribution(build)
  const isFirebase =
    build.distribution_type === 'Firebase App Distribution' ||
    /firebase/i.test(distribution)

  const headline = isFirebase
    ? `${projectName} build shared in firebase`
    : `${projectName} build shared`

  const versionLine = build.build_number?.trim()
    ? `Version :- ${build.version}(${build.build_number.trim()})`
    : `Version :- ${build.version}`

  const sections: string[] = [headline]

  const env = displayEnvironment(build)
  if (env && env !== '—') {
    sections.push(`Environment :- ${env}`)
  }

  const notes = build.notes?.trim()
  if (notes) {
    sections.push(`Notes :- ${notes}`)
  }

  sections.push(versionLine)
  sections.push(`Link :- ${build.build_link.trim()}`)

  return sections.join('\n\n')
}
