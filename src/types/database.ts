export type UserRole = 'member' | 'admin'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  approved: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string
  archived_at: string | null
}

export interface Build {
  id: string
  project_id: string
  version: string
  build_link: string
  environment: string | null
  custom_environment: string | null
  platform: string | null
  custom_platform: string | null
  build_number: string | null
  distribution_type: string | null
  custom_distribution_type: string | null
  notes: string | null
  extra_details: string | null
  created_at: string
  created_by: string
}

export interface BuildWithProject extends Build {
  project?: Project | null
  creator?: Pick<Profile, 'id' | 'email' | 'full_name'> | null
}

export interface ProjectWithLatestBuild extends Project {
  latest_build?: Build | null
  build_count?: number
}

export interface BuildFormValues {
  project_id: string
  version: string
  build_link: string
  environment: string
  custom_environment: string
  platform: string
  custom_platform: string
  build_number: string
  distribution_type: string
  custom_distribution_type: string
  notes: string
  extra_details: string
}

export interface ProjectFormValues {
  name: string
  description: string
}

export interface BuildFilters {
  search: string
  environment: string
  platform: string
  distribution_type: string
  project_id: string
  date_from: string
  date_to: string
}

export const EMPTY_BUILD_FORM: BuildFormValues = {
  project_id: '',
  version: '',
  build_link: '',
  environment: '',
  custom_environment: '',
  platform: '',
  custom_platform: '',
  build_number: '',
  distribution_type: '',
  custom_distribution_type: '',
  notes: '',
  extra_details: '',
}

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  name: '',
  description: '',
}

export const EMPTY_BUILD_FILTERS: BuildFilters = {
  search: '',
  environment: '',
  platform: '',
  distribution_type: '',
  project_id: '',
  date_from: '',
  date_to: '',
}
