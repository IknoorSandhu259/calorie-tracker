'use client'

import { useState, useEffect } from 'react'
import { signOut } from '@/lib/actions/auth'
import { updateProfileGoals } from '@/lib/actions/profile'
import { applyTheme } from '@/components/ThemeSync'
import type { GoalSet } from '@/lib/actions/profile'
import type { ProfileUpdate } from '@/lib/supabase/types'

type Theme = 'light' | 'dark' | 'system'

const inputClass =
  'w-full rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 outline-none ring-1 ring-transparent focus:ring-zinc-300'

export default function ProfileView({
  email,
  initialGoals,
}: {
  email: string
  initialGoals: GoalSet
}) {
  const [goals, setGoals] = useState({
    calories: String(initialGoals.calories),
    protein: String(initialGoals.protein),
    carbs: String(initialGoals.carbs),
    fat: String(initialGoals.fat),
  })
  const [saved, setSaved] = useState(false)
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme) setTheme(storedTheme)
  }, [])

  function handleTheme(t: Theme) {
    setTheme(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  async function handleGoalChange(
    field: keyof typeof goals,
    raw: string,
  ) {
    setGoals((prev) => ({ ...prev, [field]: raw }))
    const n = Math.round(Number(raw))
    if (!Number.isFinite(n) || n <= 0) return

    const fieldMap: Record<keyof typeof goals, keyof ProfileUpdate> = {
      calories: 'daily_kcal_target',
      protein: 'daily_protein_g',
      carbs: 'daily_carbs_g',
      fat: 'daily_fat_g',
    }

    await updateProfileGoals({ [fieldMap[field]]: n })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900">Profile</h1>

      {/* Email */}
      <section className="mb-6 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Email</p>
        <p className="break-all text-sm text-zinc-800">{email}</p>
      </section>

      {/* Calorie Goal */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Daily Calorie Goal
        </h2>
        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              min={100}
              step={100}
              value={goals.calories}
              onChange={(e) => handleGoalChange('calories', e.target.value)}
              className={inputClass}
            />
            <span className="text-sm text-zinc-400">kcal</span>
          </div>
        </div>
      </section>

      {/* Macro Goals */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Daily Macro Goals
        </h2>
        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-400" htmlFor="goal-protein">
                Protein
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="goal-protein"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={goals.protein}
                  onChange={(e) => handleGoalChange('protein', e.target.value)}
                  className={inputClass}
                />
                <span className="shrink-0 text-xs text-zinc-400">g</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-400" htmlFor="goal-carbs">
                Carbs
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="goal-carbs"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={goals.carbs}
                  onChange={(e) => handleGoalChange('carbs', e.target.value)}
                  className={inputClass}
                />
                <span className="shrink-0 text-xs text-zinc-400">g</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-400" htmlFor="goal-fat">
                Fat
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="goal-fat"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={goals.fat}
                  onChange={(e) => handleGoalChange('fat', e.target.value)}
                  className={inputClass}
                />
                <span className="shrink-0 text-xs text-zinc-400">g</span>
              </div>
            </div>
          </div>
          {saved && <p className="mt-3 text-xs text-green-600">Saved</p>}
        </div>
      </section>

      {/* Theme */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Theme
        </h2>
        <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm">
          {(['light', 'system', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              className={[
                'flex-1 rounded-xl py-2.5 text-sm font-medium capitalize transition-colors',
                theme === t
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900',
              ].join(' ')}
            >
              {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'System'}
            </button>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-red-500 shadow-sm transition-colors hover:bg-red-50"
          >
            Sign Out
          </button>
        </form>
      </section>
    </main>
  )
}
