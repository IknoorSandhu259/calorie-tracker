import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CameraView from '@/components/CameraView'

export default async function CameraPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  return <CameraView />
}
