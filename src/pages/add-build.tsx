import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BuildForm } from '@/components/builds/build-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { createBuild } from '@/lib/api'
import { EMPTY_BUILD_FORM, type BuildFormValues } from '@/types/database'

export function AddBuildPage() {
  const { user, configured } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialValues = useMemo(
    () => ({
      ...EMPTY_BUILD_FORM,
      project_id: params.get('project') ?? '',
    }),
    [params],
  )

  async function handleSubmit(values: BuildFormValues) {
    if (!user) throw new Error('You must be signed in.')
    if (!configured) throw new Error('Supabase is not configured.')
    const build = await createBuild(values, user.id)
    toast.success('Build published')
    navigate(`/builds/${build.id}`)
    return build
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish a build</CardTitle>
        <CardDescription>
          Only version and build link are required after selecting a project. Opening a saved link
          does not grant access to the original distribution platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BuildForm initialValues={initialValues} onSubmit={handleSubmit} />
      </CardContent>
    </Card>
  )
}
