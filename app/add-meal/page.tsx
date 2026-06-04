import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddMealForm from '@/components/AddMealForm'

export default async function AddMealPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  return <AddMealForm />
}
