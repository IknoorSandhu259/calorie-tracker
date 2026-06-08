import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, ActivityIndicator, Platform,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import CalorieRing from '../../components/CalorieRing'
import MacroRing from '../../components/MacroRing'
import WeightLogModal from '../../components/WeightLogModal'
import SavedMealsSheet from '../../components/SavedMealsSheet'
import { getSavedMeals, type SavedMeal } from '../../lib/savedMeals'
import { DEFAULT_GOALS, type GoalSet } from '../../lib/goals'
import { useTheme, type AppColors } from '../../constants/colors'

// Fixed accent colors — same as web
const MACRO_COLORS = { protein: '#3b82f6', carbs: '#f59e0b', fat: '#f97316' }

type Meal = {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  date: string
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

async function fetchGoals(userId: string): Promise<GoalSet> {
  const { data } = await supabase
    .from('profiles')
    .select('daily_kcal_target, daily_protein_g, daily_carbs_g, daily_fat_g')
    .eq('id', userId)
    .single()

  if (!data) return DEFAULT_GOALS
  return {
    calories: data.daily_kcal_target,
    protein: data.daily_protein_g,
    carbs: data.daily_carbs_g,
    fat: data.daily_fat_g,
  }
}

export default function HomeScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [meals, setMeals] = useState<Meal[]>([])
  const [goals, setGoals] = useState<GoalSet>(DEFAULT_GOALS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [showSavedSheet, setShowSavedSheet] = useState(false)

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein ?? 0), 0)
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs ?? 0), 0)
  const totalFat = meals.reduce((sum, m) => sum + (m.fat ?? 0), 0)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [fetchedGoals, { data: mealData }, fetchedSaved] = await Promise.all([
      fetchGoals(user.id),
      supabase
        .from('meals')
        .select('id, name, calories, protein, carbs, fat, date')
        .eq('user_id', user.id)
        .eq('date', todayISO())
        .order('created_at', { ascending: true }),
      getSavedMeals(),
    ])

    setGoals(fetchedGoals)
    setMeals(mealData ?? [])
    setSavedMeals(fetchedSaved)
  }

  async function handleQuickAdd(saved: SavedMeal) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const optimistic: Meal = {
      id: `optimistic-${Date.now()}`,
      name: saved.name,
      calories: saved.calories,
      protein: saved.protein,
      carbs: saved.carbs,
      fat: saved.fat,
      date: todayISO(),
    }
    setMeals((prev) => [...prev, optimistic])

    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        name: saved.name,
        calories: saved.calories,
        protein: saved.protein,
        carbs: saved.carbs,
        fat: saved.fat,
        date: todayISO(),
      })
      .select('id')
      .single()

    if (error) {
      setMeals((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDeleteError('Could not add meal.')
    } else if (data) {
      setMeals((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, id: data.id } : m))
      )
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      loadData().finally(() => setLoading(false))
    }, []),
  )

  async function handleDelete(id: string) {
    const snapshot = meals
    setMeals((prev) => prev.filter((m) => m.id !== id))
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

  function handleEdit(meal: Meal) {
    const params = new URLSearchParams({
      from: '/(tabs)',
      mealId: meal.id,
      mealName: meal.name,
      mealCalories: String(meal.calories),
      mealDate: meal.date,
    })

    if (meal.protein !== null) params.set('mealProtein', String(meal.protein))
    if (meal.carbs !== null) params.set('mealCarbs', String(meal.carbs))
    if (meal.fat !== null) params.set('mealFat', String(meal.fat))

    router.push(`/add-meal?${params.toString()}`)
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
        </View>

        {/* Calorie ring — primary */}
        <View style={s.ringSection}>
          <CalorieRing consumed={totalCalories} goal={goals.calories} />
        </View>

        {/* Macro rings — secondary */}
        <View style={s.macroRow}>
          <MacroRing label="Protein" consumed={totalProtein} goal={goals.protein} color={MACRO_COLORS.protein} />
          <MacroRing label="Carbs" consumed={totalCarbs} goal={goals.carbs} color={MACRO_COLORS.carbs} />
          <MacroRing label="Fat" consumed={totalFat} goal={goals.fat} color={MACRO_COLORS.fat} />
        </View>

        {/* Quick Add — saved meal chips */}
        <View style={s.quickAddSection}>
          <View style={s.quickAddHeader}>
            <Text style={s.sectionLabel}>Quick Add</Text>
            {savedMeals.length > 0 && (
              <TouchableOpacity onPress={() => setShowSavedSheet(true)}>
                <Text style={s.quickAddManage}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
          {savedMeals.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {savedMeals.map((sm) => (
                <TouchableOpacity
                  key={sm.id}
                  style={s.chip}
                  onPress={() => handleQuickAdd(sm)}
                >
                  <Text style={s.chipName} numberOfLines={1}>{sm.name}</Text>
                  <Text style={s.chipCal}>{sm.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={s.quickAddEmpty}>
              <Text style={s.quickAddEmptyText}>Use Save as template when logging to enable Quick Add.</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Meals */}
        <View style={s.mealsSection}>
          <Text style={s.sectionLabel}>Today&apos;s Meals</Text>

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
            meals.map((meal) => (
              <View key={meal.id} style={s.mealCard}>
                <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
                <View style={s.mealRight}>
                  <Text style={s.mealCal}>{meal.calories} kcal</Text>
                  <TouchableOpacity
                    onPress={() => handleEdit(meal)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Edit ${meal.name}`}
                  >
                    <Feather name="edit-2" size={15} color={c.iconMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(meal.id)}
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

      {/* Persistent action bar — always visible above tab bar */}
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
          onPress={() => router.push('/add-meal?from=%2F(tabs)')}
          accessibilityLabel="Add meal"
        >
          <Text style={s.addMealBtnText}>Add Meal</Text>
        </TouchableOpacity>
      </View>

      {showWeightModal && (
        <WeightLogModal
          onClose={() => setShowWeightModal(false)}
          onSaved={() => setShowWeightModal(false)}
        />
      )}

      <SavedMealsSheet
        visible={showSavedSheet}
        onClose={() => { setShowSavedSheet(false); getSavedMeals().then(setSavedMeals) }}
        onSelect={(meal) => { handleQuickAdd(meal); setShowSavedSheet(false) }}
      />
    </View>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingBottom: 24 },
    header: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
      paddingBottom: 8,
    },
    dateLabel: {
      fontSize: 11, fontWeight: '500', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase',
    },
    title: { fontSize: 28, fontWeight: '700', color: c.textPrimary, marginTop: 4 },
    ringSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
    macroRow: {
      flexDirection: 'row', justifyContent: 'center',
      gap: 32, paddingBottom: 24,
    },
    divider: { height: 1, backgroundColor: c.divider, marginHorizontal: 20 },
    quickAddSection: { paddingTop: 4, paddingBottom: 16, paddingHorizontal: 20 },
    quickAddHeader: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 10,
    },
    quickAddManage: { fontSize: 12, color: c.textMuted, fontWeight: '500' },
    quickAddEmpty: {
      backgroundColor: c.cardBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    quickAddEmptyText: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
    chipsRow: { gap: 8 },
    chip: {
      backgroundColor: c.cardBg, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      alignItems: 'center', minWidth: 90,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    chipName: { fontSize: 12, fontWeight: '500', color: c.textSecondary, marginBottom: 2 },
    chipCal: { fontSize: 11, color: c.textLabel },
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
