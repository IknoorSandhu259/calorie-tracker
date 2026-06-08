import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import WeightLogModal from '../../components/WeightLogModal'
import { useTheme, type AppColors } from '../../constants/colors'

type Meal = { id: string; name: string; calories: number }
type WeightEntry = { weight: number }

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function todayISO(): string {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function HistoryScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(todayISO())
  const [meals, setMeals] = useState<Meal[]>([])
  const [weightEntry, setWeightEntry] = useState<WeightEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchTick, setFetchTick] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showWeightModal, setShowWeightModal] = useState(false)

  async function fetchDay(date: string) {
    setLoading(true)
    setFetchError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [mealsResult, weightResult] = await Promise.all([
      supabase
        .from('meals')
        .select('id, name, calories')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('created_at', { ascending: true }),
      supabase
        .from('weight_logs')
        .select('weight')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle(),
    ])

    if (mealsResult.error) {
      setFetchError('Could not load entries.')
      setMeals([])
    } else {
      setMeals(mealsResult.data ?? [])
    }

    setWeightEntry(weightResult.data ? { weight: weightResult.data.weight } : null)
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchDay(selected)
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

  const hasAnyEntry = meals.length > 0 || weightEntry !== null

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>History</Text>
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

        {/* Day detail */}
        <View style={s.daySection}>
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
          ) : !hasAnyEntry ? (
            <View style={s.placeholder}>
              <Text style={s.placeholderText}>No entries for this day</Text>
            </View>
          ) : (
            <View style={s.entryList}>
              {/* Weight entry — shown when a log exists for this date */}
              {weightEntry !== null && (
                <View style={s.weightCard}>
                  <View style={s.weightLeft}>
                    <Feather name="activity" size={14} color={c.textLabel} />
                    <Text style={s.weightLabel}>Weight</Text>
                  </View>
                  <Text style={s.weightValue}>{weightEntry.weight} kg</Text>
                </View>
              )}

              {/* Meal entries */}
              {meals.length > 0 && (
                <>
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
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Persistent action bar — matches Home screen pattern */}
      <View style={s.actionBar}>
        <TouchableOpacity
          style={s.logWeightBtn}
          onPress={() => setShowWeightModal(true)}
          accessibilityLabel="Log weight"
        >
          <Text style={s.logWeightBtnText}>Log Weight</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.addMealBtn}
          onPress={() => router.push('/add-meal')}
          accessibilityLabel="Add meal"
        >
          <Text style={s.addMealBtnText}>Add Meal</Text>
        </TouchableOpacity>
      </View>

      {showWeightModal && (
        <WeightLogModal
          initialDate={isoToLocalDate(selected)}
          onClose={() => setShowWeightModal(false)}
          onSaved={() => {
            setShowWeightModal(false)
            fetchDay(selected)
          }}
        />
      )}
    </View>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 24 },
    header: {
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
      marginBottom: 20,
    },
    title: { fontSize: 28, fontWeight: '700', color: c.textPrimary },
    // Calendar card
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
    // Day detail section
    daySection: { gap: 8 },
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
    entryList: { gap: 8 },
    errorText: { fontSize: 12, color: c.error },
    // Weight entry row — visually distinct from meal cards
    weightCard: {
      backgroundColor: c.cardBg, borderRadius: 16,
      paddingHorizontal: 16, paddingVertical: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderLeftWidth: 3, borderLeftColor: c.borderInput,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    weightLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    weightLabel: { fontSize: 13, fontWeight: '500', color: c.textLabel },
    weightValue: { fontSize: 14, fontWeight: '600', color: c.textSecondary, fontVariant: ['tabular-nums'] },
    // Meal entry rows
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
    // Persistent action bar
    actionBar: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.pageBg,
    },
    logWeightBtn: {
      flex: 1,
      borderRadius: 14, paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1, borderColor: c.border,
      backgroundColor: c.cardBg,
    },
    logWeightBtnText: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
    addMealBtn: {
      flex: 2,
      borderRadius: 14, paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: c.primaryBg,
    },
    addMealBtnText: { fontSize: 14, fontWeight: '600', color: c.primaryText },
  })
}
