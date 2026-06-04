'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addMealManual } from '@/lib/actions/meal'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseOptional(val: string): number | null {
  if (val.trim() === '') return null
  const n = Number(val)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const inputClass =
  'rounded-2xl bg-white px-4 py-3.5 text-sm text-zinc-800 shadow-sm outline-none ring-1 ring-transparent placeholder:text-zinc-300 focus:ring-zinc-300 w-full'

const labelClass = 'text-xs font-semibold uppercase tracking-widest text-zinc-400'

export default function AddMealForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [date, setDate] = useState(todayISO())
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cal = Number(calories)
    if (!name.trim()) return setError('Name is required.')
    if (!Number.isFinite(cal) || cal <= 0) return setError('Enter a valid calorie amount.')
    if (!date) return setError('Date is required.')

    setSubmitting(true)
    const res = await addMealManual(
      name.trim(),
      cal,
      date,
      parseOptional(protein),
      parseOptional(carbs),
      parseOptional(fat),
    )
    setSubmitting(false)

    if ('error' in res) {
      setError(res.error)
    } else {
      router.refresh()
      router.push('/history')
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <a href="/history" aria-label="Back" className="text-zinc-400 hover:text-zinc-900 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 className="text-2xl font-bold text-zinc-900">Add Meal</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="meal-date">Date</label>
          <input
            id="meal-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="meal-name">Name</label>
          <input
            id="meal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken salad"
            className={inputClass}
          />
        </div>

        {/* Calories */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="meal-calories">Calories</label>
          <input
            id="meal-calories"
            type="number"
            inputMode="numeric"
            min={1}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g. 450"
            className={inputClass}
          />
        </div>

        {/* Optional macros */}
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Macros — optional</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-400" htmlFor="meal-protein">Protein (g)</label>
              <input
                id="meal-protein"
                type="number"
                inputMode="decimal"
                min={0}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-400" htmlFor="meal-carbs">Carbs (g)</label>
              <input
                id="meal-carbs"
                type="number"
                inputMode="decimal"
                min={0}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium text-zinc-400" htmlFor="meal-fat">Fat (g)</label>
              <input
                id="meal-fat"
                type="number"
                inputMode="decimal"
                min={0}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save Meal'}
        </button>
      </form>
    </main>
  )
}
