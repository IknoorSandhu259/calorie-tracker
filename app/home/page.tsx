import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogWeightButton from '@/components/LogWeightButton'
import HomeMeals from '@/components/HomeMeals'
import AddMealButton from '@/components/AddMealButton'
import type { HomeMeal } from '@/lib/supabase/types'

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function todayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  const today = todayISO()

  const { data: meals } = await supabase
    .from('meals')
    .select('id, name, calories, protein, carbs, fat, created_at')
    .eq('user_id', user.id)
    .eq('date', today)
    .order('created_at', { ascending: true })

  const mealList: HomeMeal[] = meals ?? []

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      {/* Header */}
      <header className="flex items-start justify-between px-5 pt-12 pb-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            {todayLabel()}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Today</h1>
        </div>
        <div className="pt-1">
          <AddMealButton returnTo="/home" />
        </div>
      </header>

      <HomeMeals initialMeals={mealList} goal={2000} />

      <LogWeightButton />
    </main>
  )
}
