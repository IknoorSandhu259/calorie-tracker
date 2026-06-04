'use client'

import { useState } from 'react'
import { deleteMeal } from '@/lib/actions/meal'
import CalorieRing from '@/components/CalorieRing'

type Meal = {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  created_at: string
}

export default function HomeMeals({
  initialMeals,
  goal,
}: {
  initialMeals: Meal[]
  goal: number
}) {
  const [meals, setMeals] = useState(initialMeals)
  const [error, setError] = useState<string | null>(null)

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)

  async function handleDelete(id: string) {
    const snapshot = meals
    setMeals((prev) => prev.filter((m) => m.id !== id))
    setError(null)
    const res = await deleteMeal(id)
    if ('error' in res) {
      setMeals(snapshot)
      setError(res.error)
    }
  }

  return (
    <>
      <section className="flex justify-center py-8">
        <CalorieRing consumed={totalCalories} goal={goal} />
      </section>

      <div className="mx-5 h-px bg-zinc-200" />

      <section className="flex-1 px-5 pt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Today&apos;s Meals
        </h2>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        {meals.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-white text-sm text-zinc-400 shadow-sm">
            No meals logged today
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {meals.map((meal) => (
              <li
                key={meal.id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm"
              >
                <span className="text-sm font-medium text-zinc-800">{meal.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-zinc-500">{meal.calories} kcal</span>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    aria-label={`Delete ${meal.name}`}
                    className="text-zinc-300 transition-colors hover:text-red-400"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
