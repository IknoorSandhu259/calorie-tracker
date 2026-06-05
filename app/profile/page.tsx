import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileView from '@/components/ProfileView'
import { getProfileGoals } from '@/lib/actions/profile'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const goals = await getProfileGoals()

  return <ProfileView email={user.email ?? ''} initialGoals={goals} />
}
