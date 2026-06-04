import { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import CalorieRing from '../components/CalorieRing'

const CALORIE_GOAL_KEY = 'calorie_goal'
const DEFAULT_GOAL = 2000

type Meal = { id: string; name: string; calories: number }

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function HomeScreen() {
  const navigation = useNavigation()
  const [meals, setMeals] = useState<Meal[]>([])
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  // Re-fetch every time the screen comes into focus (e.g. after adding a meal)
  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      loadData().finally(() => setLoading(false))
    }, [])
  )

  async function handleDelete(id: string, name: string) {
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
      Alert.alert('Error', 'Could not delete meal.')
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddMeal' as never)}
          style={styles.addButton}
          accessibilityLabel="Add meal"
        >
          <Text style={styles.addButtonText}>Add Meal</Text>
        </TouchableOpacity>
      </View>

      {/* Calorie ring */}
      <View style={styles.ringSection}>
        <CalorieRing consumed={totalCalories} goal={goal} />
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Meals */}
      <View style={styles.mealsSection}>
        <Text style={styles.sectionLabel}>Today's Meals</Text>

        {deleteError && (
          <Text style={styles.errorText}>{deleteError}</Text>
        )}

        {loading ? (
          <View style={styles.placeholderCard}>
            <ActivityIndicator color="#a1a1aa" />
          </View>
        ) : meals.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>No meals logged today</Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <Text style={styles.mealName} numberOfLines={1}>
                {meal.name}
              </Text>
              <View style={styles.mealRight}>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                <TouchableOpacity
                  onPress={() => handleDelete(meal.id, meal.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Delete ${meal.name}`}
                >
                  <Feather name="trash-2" size={15} color="#d4d4d8" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a1a1aa',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#18181b',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#18181b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ringSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e4e7',
    marginHorizontal: 20,
  },
  mealsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a1a1aa',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 4,
  },
  placeholderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#27272a',
    flex: 1,
    marginRight: 12,
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealCalories: {
    fontSize: 14,
    color: '#71717a',
    fontVariant: ['tabular-nums'],
  },
})
