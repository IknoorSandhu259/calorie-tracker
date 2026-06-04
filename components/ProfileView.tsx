'use client'

import { useState, useEffect } from 'react'
import { signOut } from '@/lib/actions/auth'

export const CALORIE_GOAL_KEY = 'calorie_goal'
export const DEFAULT_CALORIE_GOAL = 2000

export default function ProfileView({ email }: { email: string }) {
  const [goal, setGoal] = useState(String(DEFAULT_CALORIE_GOAL))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CALORIE_GOAL_KEY)
    if (stored) setGoal(stored)
  }, [])

  function handleChange(value: string) {
    setGoal(value)
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem(CALORIE_GOAL_KEY, String(n))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900">Profile</h1>

      {/* Email */}
      <section className="mb-6 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Email</p>
        <p className="text-sm text-zinc-800">{email}</p>
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
              value={goal}
              onChange={(e) => handleChange(e.target.value)}
              className="flex-1 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 outline-none ring-1 ring-transparent focus:ring-zinc-300"
            />
            <span className="text-sm text-zinc-400">kcal</span>
          </div>
          {saved && <p className="mt-2 text-xs text-green-600">Saved</p>}
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
