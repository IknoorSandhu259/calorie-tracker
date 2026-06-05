'use client'

import { useState } from 'react'
import { deleteMeal } from '@/lib/actions/meal'
import CalorieRing from '@/components/CalorieRing'
import type { HomeMeal } from '@/lib/supabase/types'
import type { GoalSet } from '@/lib/actions/profile'

const MACRO_RING_RADIUS = 28
const MACRO_RING_STROKE = 6
const MACRO_RING_CIRCUMFERENCE = 2 * Math.PI * MACRO_RING_RADIUS

function MacroRing({
  label,
  consumed,
  goal,
  colorClass,
}: {
  label: string
  consumed: number
  goal: number
  colorClass: string
}) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const dashoffset = MACRO_RING_CIRCUMFERENCE * (1 - progress)
  const display = Math.round(consumed)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[72px] w-[72px]">
        <svg viewBox="0 0 70 70" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="35" cy="35" r={MACRO_RING_RADIUS}
            fill="none" stroke="currentColor" strokeWidth={MACRO_RING_STROKE}
            className="text-zinc-200"
          />
          <circle
            cx="35" cy="35" r={MACRO_RING_RADIUS}
            fill="none" stroke="currentColor" strokeWidth={MACRO_RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={MACRO_RING_CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            className={colorClass}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold leading-none text-zinc-900">{display}</span>
          <span className="text-[9px] text-zinc-500">g</span>
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="text-[10px] text-zinc-400">{display}/{goal}g</p>
    </div>
  )
}

export default function HomeMeals({
  initialMeals,
  goals,
}: {
  initialMeals: HomeMeal[]
  goals: GoalSet
}) {
  const [meals, setMeals] = useState(initialMeals)
  const [error, setError] = useState<string | null>(null)

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein ?? 0), 0)
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs ?? 0), 0)
  const totalFat = meals.reduce((sum, m) => sum + (m.fat ?? 0), 0)

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
      <section className="flex flex-col items-center gap-6 py-8">
        <CalorieRing consumed={totalCalories} goal={goals.calories} />

        <div className="flex gap-8">
          <MacroRing
            label="Protein"
            consumed={totalProtein}
            goal={goals.protein}
            colorClass="text-blue-500"
          />
          <MacroRing
            label="Carbs"
            consumed={totalCarbs}
            goal={goals.carbs}
            colorClass="text-amber-500"
          />
          <MacroRing
            label="Fat"
            consumed={totalFat}
            goal={goals.fat}
            colorClass="text-orange-500"
          />
        </div>
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
