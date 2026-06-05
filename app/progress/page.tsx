'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WeightChart from '@/components/WeightChart'
import CalorieChart from '@/components/CalorieChart'

// ─── Types ────────────────────────────────────────────────────────────────────
// weight: null represents a period with no measurement — recharts renders a gap.
type WPoint = { date: string; weight: number | null }
type CPoint = { date: string; calories: number }
type Range  = '7D' | '30D' | '90D' | '1Y' | 'All'

const RANGES: Range[] = ['7D', '30D', '90D', '1Y', 'All']
const RANGE_DAYS: Record<Exclude<Range, 'All'>, number> = {
  '7D': 7, '30D': 30, '90D': 90, '1Y': 365,
}

// ─── Date utilities ───────────────────────────────────────────────────────────
function isoDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
}

function advanceMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  const next = new Date(y, m)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

// ─── Weight data preparation ──────────────────────────────────────────────────
// Returns a time-consistent array; null slots render as gaps in the recharts line.
function buildWeightPoints(
  rows: { date: string; weight: number }[],
  range: Range,
): WPoint[] {
  if (rows.length === 0 && range === 'All') return []

  const weightMap = new Map(rows.map(r => [r.date, r.weight]))

  if (range === '7D' || range === '30D' || range === '90D') {
    const days = RANGE_DAYS[range]
    return Array.from({ length: days }, (_, i) => {
      const iso = isoDate(days - 1 - i)
      return {
        date:   range === '7D' ? shortDay(iso) : shortDate(iso),
        weight: weightMap.get(iso) ?? null,
      }
    })
  }

  if (range === '1Y') {
    return Array.from({ length: 52 }, (_, week) => {
      const endDaysBack = (51 - week) * 7
      const weekEndIso  = isoDate(endDaysBack)
      const measurements: number[] = []
      for (let d = endDaysBack + 6; d >= endDaysBack; d--) {
        const v = weightMap.get(isoDate(d))
        if (v !== undefined) measurements.push(v)
      }
      const avg = measurements.length > 0
        ? Math.round((measurements.reduce((a, b) => a + b, 0) / measurements.length) * 10) / 10
        : null
      return { date: shortDate(weekEndIso), weight: avg }
    })
  }

  // All — monthly
  const monthMeasurements = new Map<string, number[]>()
  for (const row of rows) {
    const key = row.date.slice(0, 7)
    const arr = monthMeasurements.get(key) ?? []
    arr.push(row.weight)
    monthMeasurements.set(key, arr)
  }
  const keys = [...monthMeasurements.keys()].sort()
  if (keys.length === 0) return []

  const now    = new Date()
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let cursor   = keys[0]
  const result: WPoint[] = []
  while (cursor <= nowKey) {
    const [y, m] = cursor.split('-').map(Number)
    const label  = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const arr    = monthMeasurements.get(cursor)
    const avg    = arr
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : null
    result.push({ date: label, weight: avg })
    cursor = advanceMonth(cursor)
  }
  return result
}

// ─── Calorie data preparation ─────────────────────────────────────────────────
// Every slot in the period is present and zero-filled if no data.
function buildCaloriePoints(
  rows: { date: string; calories: number }[],
  range: Range,
): CPoint[] {
  const calMap = new Map<string, number>()
  for (const row of rows) {
    calMap.set(row.date, (calMap.get(row.date) ?? 0) + row.calories)
  }

  if (range === '7D') {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = isoDate(6 - i)
      return { date: shortDay(iso), calories: calMap.get(iso) ?? 0 }
    })
  }

  if (range === '30D') {
    return Array.from({ length: 30 }, (_, i) => {
      const iso = isoDate(29 - i)
      return { date: shortDate(iso), calories: calMap.get(iso) ?? 0 }
    })
  }

  if (range === '90D') {
    return Array.from({ length: 13 }, (_, week) => {
      const endDaysBack = (12 - week) * 7
      let total = 0
      for (let d = endDaysBack + 6; d >= endDaysBack; d--) {
        total += calMap.get(isoDate(d)) ?? 0
      }
      return { date: shortDate(isoDate(endDaysBack)), calories: total }
    })
  }

  const monthMap = new Map<string, number>()
  for (const [date, cal] of calMap.entries()) {
    const key = date.slice(0, 7)
    monthMap.set(key, (monthMap.get(key) ?? 0) + cal)
  }

  if (range === '1Y') {
    const today = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      return { date: label, calories: monthMap.get(key) ?? 0 }
    })
  }

  // All
  if (monthMap.size === 0) return []
  const now    = new Date()
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let cursor   = [...monthMap.keys()].sort()[0]
  const result: CPoint[] = []
  while (cursor <= nowKey) {
    const [y, m] = cursor.split('-').map(Number)
    const label  = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    result.push({ date: label, calories: monthMap.get(cursor) ?? 0 })
    cursor = advanceMonth(cursor)
  }
  return result
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const router = useRouter()
  const [range, setRange]             = useState<Range>('30D')
  const [weightData, setWeightData]   = useState<WPoint[]>([])
  const [calorieData, setCalorieData] = useState<CPoint[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/signin'); return }

    const weightQ = supabase
      .from('weight_logs')
      .select('date, weight')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    const mealQ = supabase
      .from('meals')
      .select('date, calories')
      .eq('user_id', user.id)

    if (range !== 'All') {
      const days = RANGE_DAYS[range]
      weightQ.gte('date', isoDate(days))
      mealQ.gte('date', isoDate(days))
    }

    const [{ data: wRows, error: wErr }, { data: mRows, error: mErr }] =
      await Promise.all([weightQ, mealQ])

    if (wErr || mErr) { setError(true); setLoading(false); return }

    setWeightData(buildWeightPoints(
      (wRows ?? []) as { date: string; weight: number }[],
      range,
    ))
    setCalorieData(buildCaloriePoints(
      (mRows ?? []) as { date: string; calories: number }[],
      range,
    ))
    setLoading(false)
  }, [range, router])

  useEffect(() => { load() }, [load])

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-zinc-50 px-5 pt-12">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Progress</h1>

      {/* ── Range selector ── */}
      <div className="mb-6 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={[
              'flex-1 rounded-lg py-2 text-xs font-medium transition-colors',
              range === r
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-900',
            ].join(' ')}
          >
            {r}
          </button>
        ))}
      </div>

      {error ? (
        <section className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-zinc-500">Could not load progress data.</p>
          <button
            onClick={load}
            className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Retry
          </button>
        </section>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
        </div>
      ) : (
        <>
          <section className="mb-8 min-w-0">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Weight
            </h2>
            <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
              <WeightChart data={weightData} />
            </div>
          </section>

          <section className="min-w-0">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Calories
            </h2>
            <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
              <CalorieChart data={calorieData} />
            </div>
          </section>
        </>
      )}
    </main>
  )
}
