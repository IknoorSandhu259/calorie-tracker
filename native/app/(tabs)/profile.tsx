import { useCallback, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'

const CALORIE_GOAL_KEY = 'calorie_goal'
const DEFAULT_GOAL = 2000

export default function ProfileScreen() {
  const [email, setEmail] = useState('')
  const [goal, setGoal] = useState(String(DEFAULT_GOAL))
  const [saved, setSaved] = useState(false)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [{ data: { user } }, stored] = await Promise.all([
          supabase.auth.getUser(),
          AsyncStorage.getItem(CALORIE_GOAL_KEY),
        ])
        if (user?.email) setEmail(user.email)
        if (stored) setGoal(stored)
      }
      load()
    }, [])
  )

  async function handleGoalChange(value: string) {
    setGoal(value)
    const n = Number(value)
    if (Number.isFinite(n) && n >= 100) {
      await AsyncStorage.setItem(CALORIE_GOAL_KEY, String(n))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    // Redirect handled by onAuthStateChange in _layout.tsx
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      {/* Email */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.fieldValue}>{email}</Text>
      </View>

      {/* Calorie goal */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Daily Calorie Goal</Text>
        <View style={styles.card}>
          <View style={styles.goalRow}>
            <TextInput
              style={styles.goalInput}
              value={goal}
              onChangeText={handleGoalChange}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <Text style={styles.goalUnit}>kcal</Text>
          </View>
          {saved && <Text style={styles.savedText}>Saved</Text>}
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1, marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 10, fontWeight: '600', color: '#a1a1aa',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  fieldValue: { fontSize: 14, color: '#27272a' },
  section: { marginBottom: 0 },
  sectionLabel: {
    fontSize: 10, fontWeight: '600', color: '#a1a1aa',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalInput: {
    flex: 1,
    backgroundColor: '#fafafa', borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 14, color: '#18181b',
    borderWidth: 1, borderColor: '#e4e4e7',
  },
  goalUnit: { fontSize: 14, color: '#a1a1aa' },
  savedText: { marginTop: 8, fontSize: 12, color: '#22c55e' },
  signOutButton: {
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
})
