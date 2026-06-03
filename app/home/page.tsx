import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalorieRing from '@/components/CalorieRing'
import SignOutButton from '@/components/SignOutButton'

type Meal = {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  created_at: string
}

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

  const mealList = (meals ?? []) as Meal[]
  const totalCalories = mealList.reduce((sum, m) => sum + (m.calories ?? 0), 0)

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
          <SignOutButton />
        </div>
      </header>

      {/* Calorie ring */}
      <section className="flex justify-center py-8">
        <CalorieRing consumed={totalCalories} goal={2000} />
      </section>

      {/* Divider */}
      <div className="mx-5 h-px bg-zinc-200" />

      {/* Today's Meals */}
      <section className="flex-1 px-5 pt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Today&apos;s Meals
        </h2>

        {mealList.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-white text-sm text-zinc-400 shadow-sm">
            No meals logged today
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {mealList.map((meal) => (
              <li
                key={meal.id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm"
              >
                <span className="text-sm font-medium text-zinc-800">
                  {meal.name}
                </span>
                <span className="text-sm tabular-nums text-zinc-500">
                  {meal.calories} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </main>
  )
}
