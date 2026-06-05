import { useCallback, useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Platform, Appearance,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { DEFAULT_GOALS, type GoalSet } from '../../lib/goals'
import { useTheme, type AppColors } from '../../constants/colors'

const THEME_KEY = 'app_theme'

type ThemeChoice = 'light' | 'system' | 'dark'

async function loadGoalsFromSupabase(userId: string): Promise<GoalSet> {
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

async function saveGoalField(userId: string, field: string, value: number) {
  await supabase
    .from('profiles')
    .upsert({ id: userId, [field]: value }, { onConflict: 'id' })
}

export default function ProfileScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [goals, setGoals] = useState<Record<string, string>>({
    calories: String(DEFAULT_GOALS.calories),
    protein: String(DEFAULT_GOALS.protein),
    carbs: String(DEFAULT_GOALS.carbs),
    fat: String(DEFAULT_GOALS.fat),
  })
  const [saved, setSaved] = useState(false)
  const [theme, setTheme] = useState<ThemeChoice>('system')

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [{ data: { user } }, storedTheme] = await Promise.all([
          supabase.auth.getUser(),
          AsyncStorage.getItem(THEME_KEY),
        ])
        if (!user) return
        setUserId(user.id)
        if (user.email) setEmail(user.email)
        if (storedTheme) setTheme(storedTheme as ThemeChoice)

        const fetched = await loadGoalsFromSupabase(user.id)
        setGoals({
          calories: String(fetched.calories),
          protein: String(fetched.protein),
          carbs: String(fetched.carbs),
          fat: String(fetched.fat),
        })
      }
      load()
    }, []),
  )

  const GOAL_FIELDS: Array<{ key: string; dbField: string; label: string; unit: string }> = [
    { key: 'calories', dbField: 'daily_kcal_target', label: 'Calories', unit: 'kcal' },
    { key: 'protein', dbField: 'daily_protein_g', label: 'Protein', unit: 'g' },
    { key: 'carbs', dbField: 'daily_carbs_g', label: 'Carbs', unit: 'g' },
    { key: 'fat', dbField: 'daily_fat_g', label: 'Fat', unit: 'g' },
  ]

  async function handleGoalChange(key: string, dbField: string, raw: string) {
    setGoals((prev) => ({ ...prev, [key]: raw }))
    const n = Math.round(Number(raw))
    if (!Number.isFinite(n) || n <= 0 || !userId) return
    await saveGoalField(userId, dbField, n)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleTheme(choice: ThemeChoice) {
    setTheme(choice)
    await AsyncStorage.setItem(THEME_KEY, choice)
    Appearance.setColorScheme(choice === 'system' ? null : choice)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>Profile</Text>

      {/* Email */}
      <View style={s.card}>
        <Text style={s.fieldLabel}>Email</Text>
        <Text style={s.fieldValue}>{email}</Text>
      </View>

      {/* Goals */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Daily Goals</Text>
        <View style={s.card}>
          {GOAL_FIELDS.map(({ key, dbField, label, unit }) => (
            <View key={key} style={s.goalRow}>
              <Text style={s.goalLabel}>{label}</Text>
              <View style={s.goalInputRow}>
                <TextInput
                  style={s.goalInput}
                  value={goals[key]}
                  onChangeText={(v) => handleGoalChange(key, dbField, v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={s.goalUnit}>{unit}</Text>
              </View>
            </View>
          ))}
          {saved && <Text style={s.savedText}>Saved</Text>}
        </View>
      </View>

      {/* Recalculate */}
      <TouchableOpacity
        style={[s.recalcBtn, { borderColor: c.border }]}
        onPress={() => router.push('/onboarding?mode=recalculate')}
      >
        <Feather name="refresh-cw" size={15} color={c.textMuted} />
        <Text style={s.recalcText}>Recalculate Goals</Text>
      </TouchableOpacity>

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
    content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
    title: {
      fontSize: 28, fontWeight: '700', color: c.textPrimary,
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
    },
    card: {
      backgroundColor: c.cardBg, borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
      gap: 12,
    },
    fieldLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
    },
    fieldValue: { fontSize: 14, color: c.textSecondary },
    section: { gap: 10 },
    sectionLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase',
    },
    goalRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    goalLabel: { fontSize: 14, color: c.textSecondary, flex: 1 },
    goalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    goalInput: {
      width: 80,
      backgroundColor: c.inputBg, borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === 'ios' ? 8 : 6,
      fontSize: 14, color: c.textPrimary, textAlign: 'right',
      borderWidth: 1, borderColor: c.border,
    },
    goalUnit: { fontSize: 13, color: c.textLabel, width: 28 },
    savedText: { fontSize: 12, color: c.success, textAlign: 'right' },
    recalcBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderRadius: 14, borderWidth: 1,
      paddingVertical: 13,
      backgroundColor: c.cardBg,
    },
    recalcText: { fontSize: 14, fontWeight: '500', color: c.textMuted },
    themeRow: {
      flexDirection: 'row', gap: 6,
      backgroundColor: c.cardBg, borderRadius: 20, padding: 4,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    themeButton: { flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: 'center' },
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
