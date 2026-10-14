import type { Build, Profile } from '@/types/database'

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
