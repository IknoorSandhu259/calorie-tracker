'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteMeal } from '@/lib/actions/meal'
import type { MealSummary } from '@/lib/supabase/types'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function todayISO(): string {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function HistoryView() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [selected, setSelected] = useState(todayISO())
  const [meals, setMeals] = useState<MealSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    const supabase = createClient()
    supabase
      .from('meals')
      .select('id, name, calories')
      .eq('date', selected)
      .order('created_at', { ascending: true })
      .then(
        ({ data, error }) => {
          if (!cancelled) {
            if (error) {
              setMeals([])
              setFetchError('Could not load meals.')
              setLoading(false)
              return
            }
            setMeals(data ?? [])
            setLoading(false)
          }
        },
        () => {
          if (!cancelled) {
            setMeals([])
            setFetchError('Could not load meals.')
            setLoading(false)
          }
        },
      )
    return () => {
      cancelled = true
    }
  }, [selected, fetchKey])

  async function handleDelete(id: string) {
    const snapshot = meals
    setMeals((prev) => prev.filter((m) => m.id !== id))
    setDeleteError(null)
    const res = await deleteMeal(id)
    if ('error' in res) {
      setMeals(snapshot)
      setDeleteError(res.error)
    } else {
      setFetchKey((k) => k + 1)
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayStr = todayISO()

  const selectedLabel = new Date(
    Number(selected.slice(0, 4)),
    Number(selected.slice(5, 7)) - 1,
    Number(selected.slice(8, 10)),
  ).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">History</h1>
        <a
          href="/add-meal"
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Add Meal
        </a>
      </div>

      {/* Calendar */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        {/* Month nav */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-800">{monthLabel}</span>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-center text-[10px] font-medium text-zinc-400">
              {d}
            </span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const iso = toISO(viewYear, viewMonth + 1, day)
            const isSelected = iso === selected
            const isToday = iso === todayStr
            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                className={[
                  'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                  isSelected
                    ? 'bg-zinc-900 text-white'
                    : isToday
                    ? 'font-semibold text-zinc-900 ring-1 ring-zinc-300'
                    : 'text-zinc-600 hover:bg-zinc-100',
                ].join(' ')}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meals for selected date */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {selectedLabel}
        </h2>

        {loading ? (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-white shadow-sm">
            <svg
              className="h-5 w-5 animate-spin text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : fetchError ? (
          <div className="flex h-24 flex-col items-center justify-center rounded-2xl bg-white shadow-sm">
            <p className="text-sm text-zinc-500">{fetchError}</p>
            <button
              onClick={() => setFetchKey((k) => k + 1)}
              className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Retry
            </button>
          </div>
        ) : meals.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-white text-sm text-zinc-400 shadow-sm">
            No meals logged
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
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
        )}
      </section>
    </main>
  )
}
