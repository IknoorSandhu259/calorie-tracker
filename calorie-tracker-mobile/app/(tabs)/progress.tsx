import { useCallback, useState } from 'react'
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet, Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import WeightChart from '../../components/WeightChart'
import CalorieChart from '../../components/CalorieChart'

type WeightPoint = { date: string; weight: number }
type CaloriePoint = { date: string; calories: number }

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

export default function ProgressScreen() {
  const [weightData, setWeightData] = useState<WeightPoint[]>([])
  const [calorieData, setCalorieData] = useState<CaloriePoint[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [{ data: weightRows }, { data: mealRows }] = await Promise.all([
          supabase
            .from('weight_logs')
            .select('date, weight')
            .eq('user_id', user.id)
            .gte('date', isoDate(30))
            .order('date', { ascending: true }),
          supabase
            .from('meals')
            .select('date, calories')
            .eq('user_id', user.id)
            .gte('date', isoDate(6)),
        ])

        setWeightData(
          (weightRows ?? []).map(r => ({
            date: shortDate(r.date as string),
            weight: r.weight as number,
          }))
        )

        // Aggregate calories per day for the last 7 days
        const calMap = new Map<string, number>()
        for (const row of mealRows ?? []) {
          const d = row.date as string
          calMap.set(d, (calMap.get(d) ?? 0) + (row.calories as number))
        }
        setCalorieData(
          Array.from({ length: 7 }, (_, i) => {
            const iso = isoDate(6 - i)
            return { date: shortDay(iso), calories: calMap.get(iso) ?? 0 }
          })
        )
        setLoading(false)
      }
      load()
    }, [])
  )

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#a1a1aa" />
        </View>
      ) : (
        <>
          {/* Weight */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Weight — last 30 days</Text>
            <View style={styles.card}>
              <WeightChart data={weightData} />
            </View>
          </View>

          {/* Calories */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Calories — last 7 days</Text>
            <View style={styles.card}>
              <CalorieChart data={calorieData} />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fafafa' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: {
    fontSize: 28, fontWeight: '700', color: '#18181b',
    paddingTop: Platform.OS === 'ios' ? 56 : 32, marginBottom: 24,
  },
  loadingRow: { height: 200, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: '600', color: '#a1a1aa',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
})
