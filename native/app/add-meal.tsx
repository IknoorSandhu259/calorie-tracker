import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseOptional(val: string): number | null {
  if (val.trim() === '') return null
  const n = Number(val)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const labelClass = { fontSize: 10, fontWeight: '600' as const, color: '#a1a1aa', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6 }

export default function AddMealScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>()
  const returnTo = from ?? '/(tabs)/history'

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    const cal = Number(calories)
    if (!name.trim()) { setError('Name is required.'); return }
    if (!Number.isFinite(cal) || cal <= 0) { setError('Enter a valid calorie amount.'); return }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setSubmitting(false); return }

    const meal: Record<string, unknown> = {
      user_id: user.id,
      name: name.trim(),
      calories: cal,
      date: todayISO(date),
    }
    const p = parseOptional(protein)
    const c = parseOptional(carbs)
    const f = parseOptional(fat)
    if (p !== null) meal.protein = p
    if (c !== null) meal.carbs = c
    if (f !== null) meal.fat = f

    const { error: dbError } = await supabase.from('meals').insert(meal)
    setSubmitting(false)

    if (dbError) { setError(dbError.message); return }
    router.replace(returnTo as never)
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace(returnTo as never)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Meal</Text>
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={labelClass}>Date</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.inputText}>{todayISO(date)}</Text>
          </TouchableOpacity>
        </View>

        {/* iOS inline date picker */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.pickerModal}>
              <View style={styles.pickerCard}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="inline"
                  onChange={(_, d) => { if (d) setDate(d) }}
                />
                <TouchableOpacity style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Android native date picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d) }}
          />
        )}

        {/* Name */}
        <View style={styles.field}>
          <Text style={labelClass}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chicken salad"
            placeholderTextColor="#d4d4d8"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Calories */}
        <View style={styles.field}>
          <Text style={labelClass}>Calories</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 450"
            placeholderTextColor="#d4d4d8"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
        </View>

        {/* Optional macros */}
        <View style={styles.field}>
          <Text style={labelClass}>Macros — optional</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Protein (g)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#d4d4d8"
                value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Carbs (g)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#d4d4d8"
                value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Fat (g)</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor="#d4d4d8"
                value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
            </View>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>{submitting ? 'Saving…' : 'Save Meal'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fafafa' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: Platform.OS === 'ios' ? 56 : 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#18181b' },
  field: { marginBottom: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 14, color: '#18181b',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  inputText: { fontSize: 14, color: '#18181b' },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroField: { flex: 1 },
  macroLabel: { fontSize: 10, color: '#a1a1aa', marginBottom: 4 },
  error: { fontSize: 12, color: '#ef4444', marginBottom: 8 },
  submitButton: {
    backgroundColor: '#18181b', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pickerModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  pickerDone: {
    alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 20,
  },
  pickerDoneText: { fontSize: 16, fontWeight: '600', color: '#18181b' },
})
