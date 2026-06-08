import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useTheme, type AppColors } from '../constants/colors'
import {
  calculateGoals,
  type Sex,
  type GoalType,
  type ActivityLevel,
  type GoalPace,
} from '../lib/goals'
import { useSetOnboardingDone } from './_layout'

// ─── Static option lists ──────────────────────────────────────────────────────

type OptionItem = { value: string; label: string; subtitle?: string }

const SEX_OPTIONS: OptionItem[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
]

const GOAL_OPTIONS: OptionItem[] = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Build muscle' },
]

const ACTIVITY_OPTIONS: OptionItem[] = [
  { value: 'sedentary', label: 'Sedentary', subtitle: 'Desk job, little or no exercise' },
  { value: 'lightly_active', label: 'Lightly active', subtitle: 'Exercise 1–3 days/week' },
  { value: 'moderately_active', label: 'Moderately active', subtitle: 'Exercise 3–5 days/week' },
  { value: 'very_active', label: 'Very active', subtitle: 'Hard exercise 6–7 days/week' },
  { value: 'extra_active', label: 'Extra active', subtitle: 'Physical job or twice-daily training' },
]

const PACE_OPTIONS: OptionItem[] = [
  { value: 'slow', label: 'Slow', subtitle: '±0.25 kg/wk' },
  { value: 'moderate', label: 'Moderate', subtitle: '±0.5 kg/wk' },
  { value: 'fast', label: 'Fast', subtitle: '±0.75 kg/wk' },
]

function labelOf(options: OptionItem[], value: string | null): string {
  return options.find((o) => o.value === value)?.label ?? '—'
}

// ─── Step-indicator ──────────────────────────────────────────────────────────

function StepDots({
  total,
  current,
  c,
}: {
  total: number
  current: number
  c: AppColors
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: i === current ? c.primaryBg : c.border,
          }}
        />
      ))}
    </View>
  )
}

// ─── Selector helpers ─────────────────────────────────────────────────────────

function SegmentedPicker<T extends string>({
  options,
  value,
  onSelect,
  s,
  c,
}: {
  options: OptionItem[]
  value: T | null
  onSelect: (v: T) => void
  s: ReturnType<typeof makeStyles>
  c: AppColors
}) {
  return (
    <View style={s.segmented}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[s.segBtn, value === opt.value && s.segBtnActive]}
          onPress={() => onSelect(opt.value as T)}
        >
          <Text style={[s.segBtnText, value === opt.value && s.segBtnTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function VerticalPicker<T extends string>({
  options,
  value,
  onSelect,
  s,
  c,
}: {
  options: OptionItem[]
  value: T | null
  onSelect: (v: T) => void
  s: ReturnType<typeof makeStyles>
  c: AppColors
}) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.verticalOption, active && s.verticalOptionActive]}
            onPress={() => onSelect(opt.value as T)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.verticalOptionLabel, active && s.verticalOptionLabelActive]}>
                {opt.label}
              </Text>
              {opt.subtitle ? (
                <Text style={[s.verticalOptionSub, active && s.verticalOptionSubActive]}>
                  {opt.subtitle}
                </Text>
              ) : null}
            </View>
            {active && <Feather name="check" size={16} color={c.primaryText} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Summary row (read-only, used on review step) ─────────────────────────────

function SummaryRow({
  label,
  value,
  c,
  s,
}: {
  label: string
  value: string
  c: AppColors
  s: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={[s.summaryLabel, { color: c.textLabel }]}>{label}</Text>
      <Text style={[s.summaryValue, { color: c.textSecondary }]}>{value}</Text>
    </View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isRecalculate = mode === 'recalculate'

  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])
  const setOnboardingDone = useSetOnboardingDone()

  const [step, setStep] = useState(0)

  // Step 0 — personal info
  const [sex, setSex] = useState<Sex | null>(null)
  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')

  // Step 1 — goal
  const [goalType, setGoalType] = useState<GoalType | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [goalPace, setGoalPace] = useState<GoalPace>('moderate')

  // Step 2 — editable calculated targets
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  type Step0Errors = { sex?: string; age?: string; height?: string; weight?: string }
  type Step1Errors = { goalType?: string; activityLevel?: string }

  const [step0Errors, setStep0Errors] = useState<Step0Errors>({})
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Pre-populate fields when launched from "Recalculate Goals" ───────────
  useEffect(() => {
    if (!isRecalculate) return

    async function loadExisting() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('age, sex, height_cm, weight_kg, goal_type, activity_level, goal_pace')
        .eq('id', user.id)
        .single()

      if (!data) return
      if (data.sex) setSex(data.sex as Sex)
      if (data.age) setAge(String(data.age))
      if (data.height_cm) setHeightCm(String(data.height_cm))
      if (data.weight_kg) setWeightKg(String(data.weight_kg))
      if (data.goal_type) setGoalType(data.goal_type as GoalType)
      if (data.activity_level) setActivityLevel(data.activity_level as ActivityLevel)
      if (data.goal_pace) setGoalPace(data.goal_pace as GoalPace)
    }

    loadExisting()
  }, [isRecalculate])

  // ── Back navigation — clear stale errors so they don't linger ────────────
  function handleBack() {
    if (step === 0) {
      router.back()
    } else if (step === 1) {
      setStep1Errors({})
      setStep(0)
    } else {
      setSaveError(null)
      setStep(1)
    }
  }

  // ── Step 0 → Step 1 ──────────────────────────────────────────────────────
  function handleStep0Next() {
    const errs: Step0Errors = {}

    if (!sex) errs.sex = 'Required'

    const a = Number(age)
    if (age.trim() === '') errs.age = 'Required'
    else if (!Number.isFinite(a) || a < 10 || a > 120) errs.age = 'Must be 10–120'

    const h = Number(heightCm)
    if (heightCm.trim() === '') errs.height = 'Required'
    else if (!Number.isFinite(h) || h < 50 || h > 280) errs.height = 'Must be 50–280 cm'

    const w = Number(weightKg)
    if (weightKg.trim() === '') errs.weight = 'Required'
    else if (!Number.isFinite(w) || w < 20 || w > 500) errs.weight = 'Must be 20–500 kg'

    if (Object.keys(errs).length > 0) {
      setStep0Errors(errs)
      return
    }
    setStep0Errors({})
    setStep(1)
  }

  // ── Step 1 → Step 2 (calculate goals) ────────────────────────────────────
  function handleStep1Next() {
    const errs: Step1Errors = {}
    if (!goalType) errs.goalType = 'Please select a goal'
    if (!activityLevel) errs.activityLevel = 'Please select your activity level'
    if (Object.keys(errs).length > 0) {
      setStep1Errors(errs)
      return
    }
    setStep1Errors({})
    const selectedGoalType = goalType
    const selectedActivityLevel = activityLevel
    if (!selectedGoalType || !selectedActivityLevel || !sex) return

    const goals = calculateGoals({
      age: Number(age),
      sex,
      height_cm: Number(heightCm),
      weight_kg: Number(weightKg),
      goal_type: selectedGoalType,
      activity_level: selectedActivityLevel,
      goal_pace: goalPace,
    })

    setCalories(String(goals.calories))
    setProtein(String(goals.protein))
    setCarbs(String(goals.carbs))
    setFat(String(goals.fat))
    setStep(2)
  }

  // ── Step 2 → Save ─────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveError(null)
    const cal = Number(calories)
    const pro = Number(protein)
    const crb = Number(carbs)
    const ft = Number(fat)
    if (
      !Number.isFinite(cal) || cal <= 0 ||
      !Number.isFinite(pro) || pro <= 0 ||
      !Number.isFinite(crb) || crb <= 0 ||
      !Number.isFinite(ft) || ft <= 0
    ) {
      setSaveError('All targets must be positive numbers.')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setSaveError('Not authenticated.')
      return
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        age: Number(age) || null,
        sex,
        height_cm: Number(heightCm) || null,
        weight_kg: Number(weightKg) || null,
        goal_type: goalType,
        activity_level: activityLevel,
        goal_pace: goalPace,
        daily_kcal_target: cal,
        daily_protein_g: pro,
        daily_carbs_g: crb,
        daily_fat_g: ft,
        onboarding_completed: true,
      },
      { onConflict: 'id' },
    )

    setSaving(false)

    if (error) {
      setSaveError(error.message)
      return
    }

    if (isRecalculate) {
      router.back()
    } else {
      setOnboardingDone(true)
      router.replace('/(tabs)')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: c.pageBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back / close button */}
        {(step > 0 || isRecalculate) && (
          <TouchableOpacity
            style={s.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color={c.textLabel} />
          </TouchableOpacity>
        )}

        <StepDots total={3} current={step} c={c} />

        {/* ── Step 0 — Personal Info ──────────────────────────────────────── */}
        {step === 0 && (
          <View>
            <Text style={[s.title, { color: c.textPrimary }]}>About you</Text>
            <Text style={[s.subtitle, { color: c.textMuted }]}>
              We use this to calculate your calorie needs.
            </Text>

            <Text style={[s.fieldLabel, { color: step0Errors.sex ? c.error : c.textLabel }]}>
              Sex{step0Errors.sex ? ' — ' + step0Errors.sex : ''}
            </Text>
            <SegmentedPicker
              options={SEX_OPTIONS} value={sex} onSelect={(v) => { setSex(v); setStep0Errors(e => ({ ...e, sex: undefined })) }}
              s={s} c={c}
            />

            <Text style={[s.fieldLabel, { color: step0Errors.age ? c.error : c.textLabel, marginTop: 20 }]}>
              Age (years){step0Errors.age ? ' — ' + step0Errors.age : ''}
            </Text>
            <TextInput
              style={[s.input, { color: c.textPrimary, borderColor: step0Errors.age ? c.error : c.border, backgroundColor: c.inputBg }]}
              value={age}
              onChangeText={(v) => { setAge(v); setStep0Errors(e => ({ ...e, age: undefined })) }}
              keyboardType="number-pad"
              placeholder="e.g. 28"
              placeholderTextColor={c.placeholder}
              selectTextOnFocus
            />

            <Text style={[s.fieldLabel, { color: step0Errors.height ? c.error : c.textLabel, marginTop: 16 }]}>
              Height (cm){step0Errors.height ? ' — ' + step0Errors.height : ''}
            </Text>
            <TextInput
              style={[s.input, { color: c.textPrimary, borderColor: step0Errors.height ? c.error : c.border, backgroundColor: c.inputBg }]}
              value={heightCm}
              onChangeText={(v) => { setHeightCm(v); setStep0Errors(e => ({ ...e, height: undefined })) }}
              keyboardType="decimal-pad"
              placeholder="e.g. 175"
              placeholderTextColor={c.placeholder}
              selectTextOnFocus
            />

            <Text style={[s.fieldLabel, { color: step0Errors.weight ? c.error : c.textLabel, marginTop: 16 }]}>
              Weight (kg){step0Errors.weight ? ' — ' + step0Errors.weight : ''}
            </Text>
            <TextInput
              style={[s.input, { color: c.textPrimary, borderColor: step0Errors.weight ? c.error : c.border, backgroundColor: c.inputBg }]}
              value={weightKg}
              onChangeText={(v) => { setWeightKg(v); setStep0Errors(e => ({ ...e, weight: undefined })) }}
              keyboardType="decimal-pad"
              placeholder="e.g. 75"
              placeholderTextColor={c.placeholder}
              selectTextOnFocus
            />

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: c.primaryBg, marginTop: 28 }]}
              onPress={handleStep0Next}
            >
              <Text style={[s.primaryBtnText, { color: c.primaryText }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 1 — Goal ───────────────────────────────────────────────── */}
        {step === 1 && (
          <View>
            <Text style={[s.title, { color: c.textPrimary }]}>Your goal</Text>
            <Text style={[s.subtitle, { color: c.textMuted }]}>
              What are you working towards?
            </Text>

            <Text style={[s.fieldLabel, { color: step1Errors.goalType ? c.error : c.textLabel }]}>
              Goal{step1Errors.goalType ? ' — ' + step1Errors.goalType : ''}
            </Text>
            <SegmentedPicker
              options={GOAL_OPTIONS} value={goalType}
              onSelect={(v) => { setGoalType(v); setStep1Errors(e => ({ ...e, goalType: undefined })) }}
              s={s} c={c}
            />

            <Text style={[s.fieldLabel, { color: step1Errors.activityLevel ? c.error : c.textLabel, marginTop: 20 }]}>
              Activity level{step1Errors.activityLevel ? ' — ' + step1Errors.activityLevel : ''}
            </Text>
            <VerticalPicker
              options={ACTIVITY_OPTIONS} value={activityLevel}
              onSelect={(v) => { setActivityLevel(v); setStep1Errors(e => ({ ...e, activityLevel: undefined })) }}
              s={s} c={c}
            />

            {goalType !== 'maintain' && (
              <>
                <Text style={[s.fieldLabel, { color: c.textLabel, marginTop: 20 }]}>Pace</Text>
                <SegmentedPicker options={PACE_OPTIONS} value={goalPace} onSelect={setGoalPace} s={s} c={c} />
              </>
            )}

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: c.primaryBg, marginTop: 28 }]}
              onPress={handleStep1Next}
            >
              <Text style={[s.primaryBtnText, { color: c.primaryText }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2 — Review ─────────────────────────────────────────────── */}
        {step === 2 && (
          <View>
            <Text style={[s.title, { color: c.textPrimary }]}>Review & save</Text>
            <Text style={[s.subtitle, { color: c.textMuted }]}>
              Check your details and adjust any target before saving.
            </Text>

            {/* Your profile — read-only summary */}
            <Text style={[s.sectionHeader, { color: c.textLabel }]}>Your profile</Text>
            <View style={[s.card, { backgroundColor: c.cardBg }]}>
              <SummaryRow label="Age" value={`${age} years`} c={c} s={s} />
              <View style={[s.cardDivider, { backgroundColor: c.border }]} />
              <SummaryRow label="Height" value={`${heightCm} cm`} c={c} s={s} />
              <View style={[s.cardDivider, { backgroundColor: c.border }]} />
              <SummaryRow label="Weight" value={`${weightKg} kg`} c={c} s={s} />
              <View style={[s.cardDivider, { backgroundColor: c.border }]} />
              <SummaryRow label="Goal" value={labelOf(GOAL_OPTIONS, goalType)} c={c} s={s} />
              <View style={[s.cardDivider, { backgroundColor: c.border }]} />
              <SummaryRow label="Activity" value={labelOf(ACTIVITY_OPTIONS, activityLevel)} c={c} s={s} />
              {goalType !== 'maintain' && (
                <>
                  <View style={[s.cardDivider, { backgroundColor: c.border }]} />
                  <SummaryRow label="Pace" value={labelOf(PACE_OPTIONS, goalPace)} c={c} s={s} />
                </>
              )}
            </View>

            {/* Daily targets — editable */}
            <Text style={[s.sectionHeader, { color: c.textLabel, marginTop: 20 }]}>Daily targets</Text>
            <View style={[s.card, { backgroundColor: c.cardBg }]}>
              {(
                [
                  { label: 'Calories', value: calories, set: setCalories, unit: 'kcal' },
                  { label: 'Protein', value: protein, set: setProtein, unit: 'g' },
                  { label: 'Carbs', value: carbs, set: setCarbs, unit: 'g' },
                  { label: 'Fat', value: fat, set: setFat, unit: 'g' },
                ] as const
              ).map(({ label, value, set, unit }, i, arr) => (
                <View key={label}>
                  <View style={s.targetRow}>
                    <Text style={[s.targetLabel, { color: c.textSecondary }]}>{label}</Text>
                    <View style={s.targetInputRow}>
                      <TextInput
                        style={[
                          s.targetInput,
                          {
                            color: c.textPrimary,
                            borderColor: c.border,
                            backgroundColor: c.inputBg,
                          },
                        ]}
                        value={value}
                        onChangeText={set}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                      <Text style={[s.targetUnit, { color: c.textLabel }]}>{unit}</Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[s.cardDivider, { backgroundColor: c.border }]} />
                  )}
                </View>
              ))}
            </View>

            {saveError && (
              <Text style={[s.errorText, { color: c.error }]}>{saveError}</Text>
            )}

            <TouchableOpacity
              style={[
                s.primaryBtn,
                { backgroundColor: c.primaryBg, marginTop: 28, opacity: saving ? 0.5 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[s.primaryBtnText, { color: c.primaryText }]}>
                {saving ? 'Saving…' : isRecalculate ? 'Save Changes' : 'Get Started'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 48,
    },
    backBtn: { marginBottom: 8, alignSelf: 'flex-start' },
    title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
    subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
    fieldLabel: {
      fontSize: 10, fontWeight: '600',
      letterSpacing: 1.4, textTransform: 'uppercase',
      marginBottom: 8,
    },
    sectionHeader: {
      fontSize: 10, fontWeight: '600',
      letterSpacing: 1.4, textTransform: 'uppercase',
      marginBottom: 10,
    },
    input: {
      borderWidth: 1, borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 13 : 11,
      fontSize: 15,
    },
    // Segmented picker
    segmented: { flexDirection: 'row', gap: 8 },
    segBtn: {
      flex: 1, borderRadius: 12, borderWidth: 1,
      borderColor: c.border, paddingVertical: 10,
      alignItems: 'center', backgroundColor: c.cardBg,
    },
    segBtnActive: { backgroundColor: c.primaryBg, borderColor: c.primaryBg },
    segBtnText: { fontSize: 13, fontWeight: '500', color: c.textMuted },
    segBtnTextActive: { color: c.primaryText, fontWeight: '600' },
    // Vertical picker
    verticalOption: {
      flexDirection: 'row', alignItems: 'center',
      padding: 14, borderRadius: 14, borderWidth: 1,
      borderColor: c.border, backgroundColor: c.cardBg,
    },
    verticalOptionActive: { borderColor: c.primaryBg, backgroundColor: c.primaryBg },
    verticalOptionLabel: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
    verticalOptionLabelActive: { color: c.primaryText },
    verticalOptionSub: { fontSize: 12, color: c.textLabel, marginTop: 2 },
    verticalOptionSubActive: { color: c.primaryText, opacity: 0.8 },
    // Shared card (summary + targets)
    card: {
      borderRadius: 20, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    cardDivider: { height: 1, marginVertical: 10 },
    // Summary rows (read-only)
    summaryRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: '500' },
    // Target rows (editable)
    targetRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    targetLabel: { fontSize: 14, flex: 1 },
    targetInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    targetInput: {
      width: 90, borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === 'ios' ? 8 : 6,
      fontSize: 14, textAlign: 'right',
    },
    targetUnit: { fontSize: 13, width: 30 },
    // Error
    errorText: { fontSize: 13, marginTop: 12 },
    // Primary button
    primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    primaryBtnText: { fontSize: 15, fontWeight: '600' },
  })
}
