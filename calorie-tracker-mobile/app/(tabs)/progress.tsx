import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import WeightChart, { type WPoint } from '../../components/WeightChart'
import CalorieChart, { type CPoint } from '../../components/CalorieChart'
import { useTheme, type AppColors } from '../../constants/colors'

// ─── Types & constants ───────────────────────────────────────────────────────
export type Range = '7D' | '30D' | '90D' | '1Y' | 'All'
const RANGES: Range[] = ['7D', '30D', '90D', '1Y', 'All']

// How many calendar days to query for each range.
// 'All' queries with no lower-bound date filter.
const RANGE_DAYS: Record<Exclude<Range, 'All'>, number> = {
  '7D': 7, '30D': 30, '90D': 90, '1Y': 365,
}

// ─── Date utilities ───────────────────────────────────────────────────────────
function isoDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const next = new Date(y, m) // month is 0-indexed in Date; m (1-indexed) advances correctly
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

// ─── Weight data preparation ──────────────────────────────────────────────────
// Builds a time-consistent array where every slot in the period is represented.
// Slots without a measurement have weight: null — the chart renders these as gaps.
//
//  7D / 30D / 90D → individual days
//  1Y             → 52 weekly slots (avg of measurements per week; null if none)
//  All            → monthly slots from earliest entry to today (avg per month)
function buildWeightPoints(
  rows: { date: string; weight: number }[],
  range: Range,
): WPoint[] {
  if (rows.length === 0 && range === 'All') return []

  const weightMap = new Map(rows.map(r => [r.date, r.weight]))

  // ── Daily granularity ────────────────────────────────────────────────────
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

  // ── Weekly granularity for 1Y ────────────────────────────────────────────
  if (range === '1Y') {
    // 52 weekly buckets; bucket 0 = oldest week, 51 = most recent
    return Array.from({ length: 52 }, (_, week) => {
      // endDaysBack = 0 for the most-recent week, 51*7 for the oldest
      const endDaysBack   = (51 - week) * 7
      const weekEndIso    = isoDate(endDaysBack)
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

  // ── Monthly granularity for All ──────────────────────────────────────────
  // Pre-aggregate rows by YYYY-MM
  const monthMeasurements = new Map<string, number[]>()
  for (const row of rows) {
    const key = row.date.slice(0, 7)
    const arr = monthMeasurements.get(key) ?? []
    arr.push(row.weight)
    monthMeasurements.set(key, arr)
  }

  const nowKey = (() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })()

  // Start from the earliest month with data
  const keys = [...monthMeasurements.keys()].sort()
  if (keys.length === 0) return []
  let cursor = keys[0]

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
// Every slot in the period is always present; missing days/weeks/months get 0.
// This keeps the axis time-consistent — empty slots show as zero-height bars.
function buildCaloriePoints(
  rows: { date: string; calories: number }[],
  range: Range,
): CPoint[] {
  // Day-level map
  const calMap = new Map<string, number>()
  for (const row of rows) {
    calMap.set(row.date, (calMap.get(row.date) ?? 0) + row.calories)
  }

  // ── 7 daily slots (zero-filled, day labels) ──────────────────────────────
  if (range === '7D') {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = isoDate(6 - i)
      return { date: shortDay(iso), calories: calMap.get(iso) ?? 0 }
    })
  }

  // ── 30 daily slots (zero-filled) ─────────────────────────────────────────
  if (range === '30D') {
    return Array.from({ length: 30 }, (_, i) => {
      const iso = isoDate(29 - i)
      return { date: shortDate(iso), calories: calMap.get(iso) ?? 0 }
    })
  }

  // ── 13 weekly slots (zero-filled) ─────────────────────────────────────────
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

  // ── 12 monthly slots for 1Y (zero-filled) ────────────────────────────────
  if (range === '1Y') {
    const monthMap = new Map<string, number>()
    for (const [date, cal] of calMap.entries()) {
      const key = date.slice(0, 7)
      monthMap.set(key, (monthMap.get(key) ?? 0) + cal)
    }
    const today = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d    = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      return { date: label, calories: monthMap.get(key) ?? 0 }
    })
  }

  // ── All: monthly slots from earliest data to now (zero-filled between) ───
  const monthMap = new Map<string, number>()
  for (const [date, cal] of calMap.entries()) {
    const key = date.slice(0, 7)
    monthMap.set(key, (monthMap.get(key) ?? 0) + cal)
  }
  if (monthMap.size === 0) return []

  const nowKey = (() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })()

  let cursor = [...monthMap.keys()].sort()[0]
  const result: CPoint[] = []
  while (cursor <= nowKey) {
    const [y, m] = cursor.split('-').map(Number)
    const label  = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    result.push({ date: label, calories: monthMap.get(cursor) ?? 0 })
    cursor = advanceMonth(cursor)
  }
  return result
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [range, setRange]             = useState<Range>('30D')
  const [weightData, setWeightData]   = useState<WPoint[]>([])
  const [calorieData, setCalorieData] = useState<CPoint[]>([])
  const [loading, setLoading]         = useState(true)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

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

        const [{ data: wRows }, { data: mRows }] = await Promise.all([weightQ, mealQ])

        setWeightData(buildWeightPoints(
          (wRows ?? []) as { date: string; weight: number }[],
          range,
        ))
        setCalorieData(buildCaloriePoints(
          (mRows ?? []) as { date: string; calories: number }[],
          range,
        ))
        setLoading(false)
      }
      load()
    }, [range])
  )

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>Progress</Text>

      {/* ── Range selector ── */}
      <View style={s.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r}
            style={[s.rangeBtn, range === r && s.rangeBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[s.rangeBtnText, range === r && s.rangeBtnTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={c.textLabel} />
        </View>
      ) : (
        <>
          <View style={s.section}>
            <Text style={s.sectionLabel}>Weight</Text>
            <View style={s.card}>
              <WeightChart data={weightData} />
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Calories</Text>
            <View style={s.card}>
              <CalorieChart data={calorieData} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(c: AppColors) {
  return StyleSheet.create({
    scroll:   { flex: 1, backgroundColor: c.pageBg },
    content:  { paddingHorizontal: 20, paddingBottom: 32 },
    title: {
      fontSize: 28, fontWeight: '700', color: c.textPrimary,
      paddingTop: Platform.OS === 'ios' ? 56 : 32, marginBottom: 16,
    },
    rangeRow: {
      flexDirection: 'row',
      backgroundColor: c.cardBg,
      borderRadius: 12, padding: 3, marginBottom: 20,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    rangeBtn:           { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10 },
    rangeBtnActive:     { backgroundColor: c.primaryBg },
    rangeBtnText:       { fontSize: 12, fontWeight: '500', color: c.textLabel },
    rangeBtnTextActive: { color: c.primaryText, fontWeight: '600' },
    loadingRow:  { height: 200, alignItems: 'center', justifyContent: 'center' },
    section:     { marginBottom: 24 },
    sectionLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
    },
    card: {
      backgroundColor: c.cardBg, borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
  })
}
