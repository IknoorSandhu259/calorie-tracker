import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HistoryView from '@/components/HistoryView'

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  return <HistoryView />
}
