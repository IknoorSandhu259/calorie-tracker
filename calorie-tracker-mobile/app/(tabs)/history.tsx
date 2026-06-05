import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useTheme, type AppColors } from '../../constants/colors'

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
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(todayISO())
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchTick, setFetchTick] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function fetchMeals(date: string) {
    setLoading(true)
    setFetchError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await supabase
      .from('meals')
      .select('id, name, calories')
      .eq('user_id', user.id)
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
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const todayStr = todayISO()

  const selectedLabel = new Date(
    Number(selected.slice(0, 4)),
    Number(selected.slice(5, 7)) - 1,
    Number(selected.slice(8, 10)),
  ).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>History</Text>
        <TouchableOpacity
          style={s.addButton}
          onPress={() => router.push('/add-meal')}
          accessibilityLabel="Add meal"
        >
          <Text style={s.addButtonText}>Add Meal</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={s.card}>
        {/* Month nav */}
        <View style={s.monthRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={20} color={c.textLabel} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-right" size={20} color={c.textLabel} />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={s.weekdayRow}>
          {WEEKDAYS.map(d => (
            <Text key={d} style={s.weekdayLabel}>{d}</Text>
          ))}
        </View>

        {/* Day grid */}
        {weeks.map((week, wi) => (
          <View key={wi} style={s.weekRow}>
            {week.map((day, di) => {
              if (day === null) {
                return <View key={di} style={s.emptyCell} />
              }
              const iso = toISO(viewYear, viewMonth + 1, day)
              const isSelected = iso === selected
              const isToday = iso === todayStr

              return (
                <TouchableOpacity
                  key={di}
                  onPress={() => handleSelectDate(iso)}
                  style={[
                    s.dayCell,
                    isSelected && s.selectedDay,
                    !isSelected && isToday && s.todayDay,
                  ]}
                >
                  <Text style={[
                    s.dayText,
                    isSelected && s.selectedDayText,
                    !isSelected && isToday && s.todayDayText,
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
      <View style={s.mealsSection}>
        <Text style={s.sectionLabel}>{selectedLabel}</Text>

        {loading ? (
          <View style={s.placeholder}>
            <ActivityIndicator color={c.textLabel} />
          </View>
        ) : fetchError ? (
          <View style={s.placeholder}>
            <Text style={s.placeholderText}>{fetchError}</Text>
            <TouchableOpacity
              onPress={() => setFetchTick(t => t + 1)}
              style={s.retryButton}
            >
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : meals.length === 0 ? (
          <View style={s.placeholder}>
            <Text style={s.placeholderText}>No meals logged</Text>
          </View>
        ) : (
          <View style={s.mealList}>
            {deleteError && <Text style={s.errorText}>{deleteError}</Text>}
            {meals.map(meal => (
              <View key={meal.id} style={s.mealCard}>
                <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
                <View style={s.mealRight}>
                  <Text style={s.mealCal}>{meal.calories} kcal</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(meal.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${meal.name}`}
                  >
                    <Feather name="trash-2" size={15} color={c.iconMuted} />
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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.pageBg },
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
      marginBottom: 20,
    },
    title: { fontSize: 28, fontWeight: '700', color: c.textPrimary },
    addButton: {
      backgroundColor: c.primaryBg, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 9,
    },
    addButtonText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    card: {
      backgroundColor: c.cardBg, borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1, marginBottom: 20,
    },
    monthRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 12,
    },
    monthLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayLabel: {
      flex: 1, textAlign: 'center', fontSize: 10,
      fontWeight: '500', color: c.textLabel,
    },
    weekRow: { flexDirection: 'row' },
    emptyCell: { flex: 1, aspectRatio: 1 },
    dayCell: {
      flex: 1, aspectRatio: 1,
      alignItems: 'center', justifyContent: 'center',
      borderRadius: 100,
    },
    selectedDay: { backgroundColor: c.primaryBg },
    todayDay: { borderWidth: 1, borderColor: c.borderInput },
    dayText: { fontSize: 14, color: c.textSecondary },
    selectedDayText: { color: c.primaryText, fontWeight: '600' },
    todayDayText: { fontWeight: '700', color: c.textPrimary },
    mealsSection: { gap: 8 },
    sectionLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
    },
    placeholder: {
      backgroundColor: c.cardBg, borderRadius: 16, height: 96,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    placeholderText: { fontSize: 14, color: c.textLabel },
    retryButton: {
      marginTop: 10, backgroundColor: c.primaryBg,
      borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    },
    retryText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    mealList: { gap: 8 },
    errorText: { fontSize: 12, color: c.error },
    mealCard: {
      backgroundColor: c.cardBg, borderRadius: 16,
      paddingHorizontal: 16, paddingVertical: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    mealName: { fontSize: 14, fontWeight: '500', color: c.textSecondary, flex: 1, marginRight: 12 },
    mealRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mealCal: { fontSize: 14, color: c.textMuted, fontVariant: ['tabular-nums'] },
  })
}
