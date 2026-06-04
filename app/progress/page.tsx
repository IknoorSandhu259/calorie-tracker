import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WeightChart from '@/components/WeightChart'
import CalorieChart from '@/components/CalorieChart'
import type { MealRow, WeightLogRow } from '@/lib/supabase/types'

type WeightProgressRow = Pick<WeightLogRow, 'date' | 'weight'>
type CalorieProgressRow = Pick<MealRow, 'date' | 'calories'>

function isoDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function shortDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short' })
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const [{ data: weightRows }, { data: mealRows }] = await Promise.all([
    supabase
      .from('weight_logs')
      .select('date, weight')
      .eq('user_id', user.id)
      .gte('date', isoDate(30))
      .order('date', { ascending: true }),
    supabase
      .from('meals')
      .select('date, calories')
      .eq('user_id', user.id)
      .gte('date', isoDate(6)),
  ])

  const weightData = ((weightRows ?? []) as WeightProgressRow[]).map((r) => ({
    date: shortDate(r.date),
    weight: r.weight,
  }))

  // Build a map of date → total calories, then fill all 7 days
  const calMap = new Map<string, number>()
  for (const row of (mealRows ?? []) as CalorieProgressRow[]) {
    calMap.set(row.date, (calMap.get(row.date) ?? 0) + row.calories)
  }
  const calorieData = Array.from({ length: 7 }, (_, i) => {
    const iso = isoDate(6 - i)
    return { date: shortDay(iso), calories: calMap.get(iso) ?? 0 }
  })

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900">Progress</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Weight — last 30 days
        </h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <WeightChart data={weightData} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Calories — last 7 days
        </h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <CalorieChart data={calorieData} />
        </div>
      </section>
    </main>
  )
}
