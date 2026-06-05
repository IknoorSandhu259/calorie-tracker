import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, Appearance,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { useTheme, type AppColors } from '../../constants/colors'

const CALORIE_GOAL_KEY = 'calorie_goal'
const THEME_KEY = 'app_theme'
const DEFAULT_GOAL = 2000

type ThemeChoice = 'light' | 'system' | 'dark'

export default function ProfileScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [email, setEmail] = useState('')
  const [goal, setGoal] = useState(String(DEFAULT_GOAL))
  const [saved, setSaved] = useState(false)
  const [theme, setTheme] = useState<ThemeChoice>('system')

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [{ data: { user } }, stored, storedTheme] = await Promise.all([
          supabase.auth.getUser(),
          AsyncStorage.getItem(CALORIE_GOAL_KEY),
          AsyncStorage.getItem(THEME_KEY),
        ])
        if (user?.email) setEmail(user.email)
        if (stored) setGoal(stored)
        if (storedTheme) setTheme(storedTheme as ThemeChoice)
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

  async function handleTheme(choice: ThemeChoice) {
    setTheme(choice)
    await AsyncStorage.setItem(THEME_KEY, choice)
    Appearance.setColorScheme(choice === 'system' ? null : choice)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    // Redirect handled by onAuthStateChange in _layout.tsx
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>Profile</Text>

      {/* Email */}
      <View style={s.card}>
        <Text style={s.fieldLabel}>Email</Text>
        <Text style={s.fieldValue}>{email}</Text>
      </View>

      {/* Calorie goal */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Daily Calorie Goal</Text>
        <View style={s.card}>
          <View style={s.goalRow}>
            <TextInput
              style={s.goalInput}
              value={goal}
              onChangeText={handleGoalChange}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <Text style={s.goalUnit}>kcal</Text>
          </View>
          {saved && <Text style={s.savedText}>Saved</Text>}
        </View>
      </View>

      {/* Theme */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Theme</Text>
        <View style={s.themeRow}>
          {(['light', 'system', 'dark'] as ThemeChoice[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.themeButton, theme === t && s.themeButtonActive]}
              onPress={() => handleTheme(t)}
            >
              <Text style={[s.themeButtonText, theme === t && s.themeButtonTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.pageBg },
    content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
    title: {
      fontSize: 28, fontWeight: '700', color: c.textPrimary,
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
    },
    card: {
      backgroundColor: c.cardBg, borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    fieldLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
    },
    fieldValue: { fontSize: 14, color: c.textSecondary },
    section: { gap: 10 },
    sectionLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase',
    },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    goalInput: {
      flex: 1,
      backgroundColor: c.inputBg, borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 11 : 9,
      fontSize: 14, color: c.textPrimary,
      borderWidth: 1, borderColor: c.border,
    },
    goalUnit: { fontSize: 14, color: c.textLabel },
    savedText: { marginTop: 8, fontSize: 12, color: c.success },
    themeRow: {
      flexDirection: 'row', gap: 6,
      backgroundColor: c.cardBg, borderRadius: 20, padding: 4,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    themeButton: {
      flex: 1, borderRadius: 16, paddingVertical: 10,
      alignItems: 'center',
    },
    themeButtonActive: { backgroundColor: c.primaryBg },
    themeButtonText: { fontSize: 13, fontWeight: '500', color: c.textMuted },
    themeButtonTextActive: { color: c.primaryText },
    signOutButton: {
      backgroundColor: c.cardBg, borderRadius: 20, paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    signOutText: { fontSize: 14, fontWeight: '600', color: c.error },
  })
}
