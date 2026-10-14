import { safeExternalUrl } from '@/lib/utils'

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`
  return null
}

export function validateBuildLink(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Build link is required.'
  if (!safeExternalUrl(trimmed)) {
    return 'Enter a valid HTTP or HTTPS URL.'
  }
  return null
}

export function validateProjectName(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Project name is required.'
  if (trimmed.length < 2) return 'Project name must be at least 2 characters.'
  if (trimmed.length > 120) return 'Project name must be 120 characters or fewer.'
  return null
}
