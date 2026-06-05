import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, ActivityIndicator, Platform,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import CalorieRing from '../../components/CalorieRing'
import WeightLogModal from '../../components/WeightLogModal'
import { useTheme, type AppColors } from '../../constants/colors'

const CALORIE_GOAL_KEY = 'calorie_goal'
const DEFAULT_GOAL = 2000

type Meal = { id: string; name: string; calories: number }

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

export default function HomeScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [meals, setMeals] = useState<Meal[]>([])
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showWeightModal, setShowWeightModal] = useState(false)

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)

  async function loadData() {
    const [{ data: { user } }, stored] = await Promise.all([
      supabase.auth.getUser(),
      AsyncStorage.getItem(CALORIE_GOAL_KEY),
    ])
    if (!user) return

    if (stored) {
      const n = Number(stored)
      if (Number.isFinite(n) && n > 0) setGoal(n)
    }

    const { data } = await supabase
      .from('meals')
      .select('id, name, calories')
      .eq('user_id', user.id)
      .eq('date', todayISO())
      .order('created_at', { ascending: true })

    setMeals(data ?? [])
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      loadData().finally(() => setLoading(false))
    }, [])
  )

  async function handleDelete(id: string, name: string) {
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
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.dateLabel}>{todayLabel()}</Text>
            <Text style={s.title}>Today</Text>
          </View>
          <TouchableOpacity
            style={s.addButton}
            onPress={() => router.push('/add-meal?from=%2F(tabs)')}
            accessibilityLabel="Add meal"
          >
            <Text style={s.addButtonText}>Add Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie ring */}
        <View style={s.ringSection}>
          <CalorieRing consumed={totalCalories} goal={goal} />
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Meals */}
        <View style={s.mealsSection}>
          <Text style={s.sectionLabel}>Today's Meals</Text>

          {deleteError && <Text style={s.errorText}>{deleteError}</Text>}

          {loading ? (
            <View style={s.placeholder}>
              <ActivityIndicator color={c.textLabel} />
            </View>
          ) : meals.length === 0 ? (
            <View style={s.placeholder}>
              <Text style={s.placeholderText}>No meals logged today</Text>
            </View>
          ) : (
            meals.map(meal => (
              <View key={meal.id} style={s.mealCard}>
                <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
                <View style={s.mealRight}>
                  <Text style={s.mealCal}>{meal.calories} kcal</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(meal.id, meal.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${meal.name}`}
                  >
                    <Feather name="trash-2" size={15} color={c.iconMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Log Weight button — mirrors the web app's fixed button */}
      <TouchableOpacity
        style={s.logWeightButton}
        onPress={() => setShowWeightModal(true)}
        accessibilityLabel="Log weight"
      >
        <Text style={s.logWeightText}>Log Weight</Text>
      </TouchableOpacity>

      {showWeightModal && (
        <WeightLogModal
          onClose={() => setShowWeightModal(false)}
          onSaved={() => setShowWeightModal(false)}
        />
      )}
    </View>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingBottom: 120 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
      paddingBottom: 8,
    },
    dateLabel: {
      fontSize: 11, fontWeight: '500', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase',
    },
    title: { fontSize: 28, fontWeight: '700', color: c.textPrimary, marginTop: 4 },
    addButton: {
      backgroundColor: c.primaryBg, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 9, marginTop: 6,
    },
    addButtonText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    ringSection: { alignItems: 'center', paddingVertical: 32 },
    divider: { height: 1, backgroundColor: c.divider, marginHorizontal: 20 },
    mealsSection: { paddingHorizontal: 20, paddingTop: 20, gap: 8 },
    sectionLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
    },
    errorText: { fontSize: 12, color: c.error, marginBottom: 4 },
    placeholder: {
      backgroundColor: c.cardBg, borderRadius: 16, height: 96,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    placeholderText: { fontSize: 14, color: c.textLabel },
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
    logWeightButton: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 104 : 80,
      right: 20,
      backgroundColor: c.primaryBg,
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 12,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    logWeightText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
  })
}
