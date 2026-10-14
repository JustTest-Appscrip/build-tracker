export const ENVIRONMENTS = [
  'Development',
  'QA',
  'Staging',
  'Production',
  'UAT',
  'Demo',
  'Other',
] as const

export const PLATFORMS = [
  'Android',
  'iOS',
  'Both',
  'Web',
  'Other',
] as const

export const DISTRIBUTION_TYPES = [
  'Firebase App Distribution',
  'TestFlight',
  'Google Play Internal Testing',
  'Google Play',
  'App Store',
  'Other',
] as const

export type EnvironmentOption = (typeof ENVIRONMENTS)[number]
export type PlatformOption = (typeof PLATFORMS)[number]
export type DistributionOption = (typeof DISTRIBUTION_TYPES)[number]

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/projects', label: 'Projects', icon: 'FolderKanban' },
  { to: '/builds/new', label: 'Add Build', icon: 'PlusCircle' },
  { to: '/builds', label: 'Build History', icon: 'History' },
  { to: '/settings', label: 'Settings', icon: 'Settings' },
] as const
