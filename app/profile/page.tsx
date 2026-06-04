import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileView from '@/components/ProfileView'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  return <ProfileView email={user.email ?? ''} />
}
