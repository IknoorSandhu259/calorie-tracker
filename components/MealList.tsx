'use client'

import { useState } from 'react'
import { deleteMeal } from '@/lib/actions/meal'

type Meal = { id: string; name: string; calories: number }

export default function MealList({ meals: initial }: { meals: Meal[] }) {
  const [meals, setMeals] = useState(initial)
  const [error, setError] = useState<string | null>(null)

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

  if (meals.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl bg-white text-sm text-zinc-400 shadow-sm">
        No meals logged today
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <ul className="flex flex-col gap-2">
        {meals.map((meal) => (
          <li
            key={meal.id}
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm"
          >
            <span className="text-sm font-medium text-zinc-800">{meal.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-zinc-500">
                {meal.calories} kcal
              </span>
              <button
                onClick={() => handleDelete(meal.id)}
                aria-label={`Delete ${meal.name}`}
                className="text-zinc-300 transition-colors hover:text-red-400"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
