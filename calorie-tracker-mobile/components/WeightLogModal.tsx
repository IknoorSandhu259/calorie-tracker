import { useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable,
  StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useTheme, type AppColors } from '../constants/colors'

function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  onClose: () => void
  onSaved: () => void
  initialDate?: Date
}

export default function WeightLogModal({ onClose, onSaved, initialDate }: Props) {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(initialDate ?? new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    const kg = parseFloat(weight)
    if (!weight.trim() || !Number.isFinite(kg) || kg < 20 || kg > 500) {
      setError('Enter a weight between 20 and 500 kg.')
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setSubmitting(false); return }

    const { error: dbError } = await supabase
      .from('weight_logs')
      .upsert(
        { user_id: user.id, date: todayISO(date), weight: kg },
        { onConflict: 'user_id,date' }
      )

    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }
    onSaved()
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop — tapping outside dismisses */}
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.centring}
        >
          {/* Card absorbs touches so they don't reach the backdrop */}
          <Pressable style={s.card} onPress={() => {}}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>Log Weight</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color={c.textLabel} />
              </TouchableOpacity>
            </View>

            {/* Weight input */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 79.5"
                placeholderTextColor={c.placeholder}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

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
              <View style={s.pickerWrap}>
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

            {error && <Text style={s.error}>{error}</Text>}

            {/* Action buttons */}
            <View style={s.buttonRow}>
              <TouchableOpacity style={s.cancelButton} onPress={onClose}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveButton, submitting && s.buttonDisabled]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={c.primaryText} size="small" />
                  : <Text style={s.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    centring: {
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: c.cardBg,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
    field: { marginBottom: 12 },
    fieldLabel: {
      fontSize: 10, fontWeight: '600', color: c.textLabel,
      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
    },
    input: {
      backgroundColor: c.inputBg, borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 13 : 11,
      fontSize: 14, color: c.textPrimary,
      borderWidth: 1, borderColor: c.border,
      justifyContent: 'center',
    },
    inputText: { fontSize: 14, color: c.textPrimary },
    pickerWrap: {
      backgroundColor: c.inputBg, borderRadius: 12,
      marginBottom: 12, padding: 4, overflow: 'hidden',
    },
    pickerDone: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12 },
    pickerDoneText: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
    error: { fontSize: 12, color: c.error, marginBottom: 10 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelButton: {
      flex: 1, borderRadius: 12, paddingVertical: 13,
      alignItems: 'center', borderWidth: 1, borderColor: c.border,
    },
    cancelText: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
    saveButton: {
      flex: 1, borderRadius: 12, paddingVertical: 13,
      alignItems: 'center', backgroundColor: c.primaryBg,
    },
    buttonDisabled: { opacity: 0.5 },
    saveText: { fontSize: 14, fontWeight: '600', color: c.primaryText },
  })
}
