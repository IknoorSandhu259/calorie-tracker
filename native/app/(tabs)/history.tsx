import { useCallback, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

type Meal = { id: string; name: string; calories: number }

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function todayISO(): string {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [selected, setSelected] = useState(todayISO())
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchTick, setFetchTick] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function fetchMeals(date: string) {
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('meals')
      .select('id, name, calories')
      .eq('date', date)
      .order('created_at', { ascending: true })

    if (error) {
      setFetchError('Could not load meals.')
      setMeals([])
    } else {
      setMeals(data ?? [])
    }
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchMeals(selected)
    }, [selected, fetchTick])
  )

  function handleSelectDate(date: string) {
    setSelected(date)
  }

  async function handleDelete(id: string) {
    const snapshot = meals
    setMeals(prev => prev.filter(m => m.id !== id))
    setDeleteError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      setMeals(snapshot)
      setDeleteError('Could not delete meal.')
    } else {
      setFetchTick(t => t + 1)
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const todayStr = todayISO()
  const cellSize = Math.floor((width - 40) / 7)

  const selectedLabel = new Date(
    Number(selected.slice(0, 4)),
    Number(selected.slice(5, 7)) - 1,
    Number(selected.slice(8, 10)),
  ).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-meal')}
          accessibilityLabel="Add meal"
        >
          <Text style={styles.addButtonText}>Add Meal</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={styles.card}>
        {/* Month nav */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-right" size={20} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map(d => (
            <Text key={d} style={[styles.weekdayLabel, { width: cellSize }]}>{d}</Text>
          ))}
        </View>

        {/* Day grid */}
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) {
                return <View key={di} style={{ width: cellSize, height: cellSize }} />
              }
              const iso = toISO(viewYear, viewMonth + 1, day)
              const isSelected = iso === selected
              const isToday = iso === todayStr

              return (
                <TouchableOpacity
                  key={di}
                  onPress={() => handleSelectDate(iso)}
                  style={[
                    styles.dayCell,
                    { width: cellSize, height: cellSize },
                    isSelected && styles.selectedDay,
                    !isSelected && isToday && styles.todayDay,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.selectedDayText,
                    !isSelected && isToday && styles.todayDayText,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
      </View>

      {/* Meals for selected date */}
      <View style={styles.mealsSection}>
        <Text style={styles.sectionLabel}>{selectedLabel}</Text>

        {loading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color="#a1a1aa" />
          </View>
        ) : fetchError ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{fetchError}</Text>
            <TouchableOpacity
              onPress={() => setFetchTick(t => t + 1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : meals.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No meals logged</Text>
          </View>
        ) : (
          <View style={styles.mealList}>
            {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
            {meals.map(meal => (
              <View key={meal.id} style={styles.mealCard}>
                <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                <View style={styles.mealRight}>
                  <Text style={styles.mealCal}>{meal.calories} kcal</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(meal.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${meal.name}`}
                  >
                    <Feather name="trash-2" size={15} color="#d4d4d8" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fafafa' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#18181b' },
  addButton: {
    backgroundColor: '#18181b', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1, marginBottom: 20,
  },
  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  monthLabel: { fontSize: 14, fontWeight: '600', color: '#18181b' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: {
    textAlign: 'center', fontSize: 10,
    fontWeight: '500', color: '#a1a1aa',
  },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 100,
  },
  selectedDay: { backgroundColor: '#18181b' },
  todayDay: {
    borderWidth: 1, borderColor: '#d4d4d8',
  },
  dayText: { fontSize: 14, color: '#52525b' },
  selectedDayText: { color: '#fff', fontWeight: '600' },
  todayDayText: { fontWeight: '700', color: '#18181b' },
  mealsSection: { gap: 8 },
  sectionLabel: {
    fontSize: 10, fontWeight: '600', color: '#a1a1aa',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
  },
  placeholder: {
    backgroundColor: '#fff', borderRadius: 16, height: 96,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  placeholderText: { fontSize: 14, color: '#a1a1aa' },
  retryButton: {
    marginTop: 10, backgroundColor: '#18181b',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  mealList: { gap: 8 },
  errorText: { fontSize: 12, color: '#ef4444' },
  mealCard: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  mealName: { fontSize: 14, fontWeight: '500', color: '#27272a', flex: 1, marginRight: 12 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealCal: { fontSize: 14, color: '#71717a', fontVariant: ['tabular-nums'] },
})
