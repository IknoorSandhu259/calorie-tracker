import { useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { saveMealTemplate } from '../lib/savedMeals'
import SavedMealsSheet from '../components/SavedMealsSheet'
import { useTheme, type AppColors } from '../constants/colors'

function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseOptional(val: string): number | null {
  if (val.trim() === '') return null
  const n = Number(val)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default function AddMealScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>()
  const returnTo = from ?? '/(tabs)/history'

  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [showSavedMeals, setShowSavedMeals] = useState(false)
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
    const cv = parseOptional(carbs)
    const f = parseOptional(fat)
    if (p !== null) meal.protein = p
    if (cv !== null) meal.carbs = cv
    if (f !== null) meal.fat = f

    const { error: dbError } = await supabase.from('meals').insert(meal)
    setSubmitting(false)

    if (dbError) { setError(dbError.message); return }

    if (saveAsTemplate) {
      await saveMealTemplate({
        name: name.trim(),
        calories: cal,
        protein: p,
        carbs: cv,
        fat: f,
      })
    }

    router.replace(returnTo as never)
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={c.textLabel} />
          </TouchableOpacity>
          <Text style={s.title}>Add Meal</Text>
          <TouchableOpacity style={s.templateBtn} onPress={() => setShowSavedMeals(true)}>
            <Feather name="bookmark" size={15} color={c.textMuted} />
            <Text style={s.templateBtnText}>Saved</Text>
          </TouchableOpacity>
        </View>

        <SavedMealsSheet
          visible={showSavedMeals}
          onClose={() => setShowSavedMeals(false)}
          onSelect={(meal) => {
            setName(meal.name)
            setCalories(String(meal.calories))
            setProtein(meal.protein != null ? String(meal.protein) : '')
            setCarbs(meal.carbs != null ? String(meal.carbs) : '')
            setFat(meal.fat != null ? String(meal.fat) : '')
          }}
        />

        {/* Date */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Date</Text>
          <TouchableOpacity
            style={s.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={s.inputText}>{todayISO(date)}</Text>
          </TouchableOpacity>
        </View>

        {/* iOS inline date picker */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={s.pickerModal}>
              <View style={s.pickerCard}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="inline"
                  themeVariant={c.isDark ? 'dark' : 'light'}
                  onChange={(_, d) => { if (d) setDate(d) }}
                />
                <TouchableOpacity style={s.pickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={s.pickerDoneText}>Done</Text>
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
        <View style={s.field}>
          <Text style={s.fieldLabel}>Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Chicken salad"
            placeholderTextColor={c.placeholder}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Calories */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Calories</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 450"
            placeholderTextColor={c.placeholder}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
        </View>

        {/* Optional macros */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Macros — optional</Text>
          <View style={s.macroRow}>
            <View style={s.macroField}>
              <Text style={s.macroLabel}>Protein (g)</Text>
              <TextInput style={s.input} placeholder="0" placeholderTextColor={c.placeholder}
                value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
            </View>
            <View style={s.macroField}>
              <Text style={s.macroLabel}>Carbs (g)</Text>
              <TextInput style={s.input} placeholder="0" placeholderTextColor={c.placeholder}
                value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
            </View>
            <View style={s.macroField}>
              <Text style={s.macroLabel}>Fat (g)</Text>
              <TextInput style={s.input} placeholder="0" placeholderTextColor={c.placeholder}
                value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
            </View>
          </View>
        </View>

        {/* Save as template toggle */}
        <TouchableOpacity style={s.saveTemplateRow} onPress={() => setSaveAsTemplate((v) => !v)}>
          <Feather
            name={saveAsTemplate ? 'check-square' : 'square'}
            size={16}
            color={saveAsTemplate ? c.textPrimary : c.textLabel}
          />
          <Text style={[s.saveTemplateText, { color: saveAsTemplate ? c.textPrimary : c.textLabel }]}>
            Save as template
          </Text>
        </TouchableOpacity>

        {error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.submitButton, submitting && s.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={s.submitText}>{submitting ? 'Saving…' : 'Save Meal'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: Platform.OS === 'ios' ? 56 : 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'space-between' },
    templateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    templateBtnText: { fontSize: 13, fontWeight: '500', color: c.textMuted },
    title: { fontSize: 24, fontWeight: '700', color: c.textPrimary },
    field: { marginBottom: 16 },
    fieldLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
    },
    input: {
      backgroundColor: c.cardBg, borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 14, color: c.textPrimary,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
      justifyContent: 'center',
    },
    inputText: { fontSize: 14, color: c.textPrimary },
    macroRow: { flexDirection: 'row', gap: 10 },
    macroField: { flex: 1 },
    macroLabel: { fontSize: 10, color: c.textLabel, marginBottom: 4 },
    error: { fontSize: 12, color: c.error, marginBottom: 8 },
    submitButton: {
      backgroundColor: c.primaryBg, borderRadius: 16,
      paddingVertical: 16, alignItems: 'center', marginTop: 8,
    },
    submitDisabled: { opacity: 0.5 },
    saveTemplateRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginBottom: 12, paddingVertical: 4,
    },
    saveTemplateText: { fontSize: 13 },
    submitText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    pickerModal: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    pickerCard: {
      backgroundColor: c.cardBg,
      borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
    },
    pickerDone: {
      alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 20,
    },
    pickerDoneText: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  })
}
