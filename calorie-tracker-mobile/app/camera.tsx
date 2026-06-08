import { useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Platform, SafeAreaView,
  KeyboardAvoidingView, Keyboard, ScrollView, Alert, Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { analyzeFood, type FoodAnalysis } from '../lib/analyzeFood'
import { supabase } from '../lib/supabase'

type Screen = 'camera' | 'preview'
type AnalyzeState = 'idle' | 'loading' | 'done' | 'error'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseRequiredNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  // Track whether the native camera session is ready to accept takePictureAsync calls.
  // CameraView's internal ref uses optional chaining and returns undefined (silently)
  // if the native session hasn't started yet — the onCameraReady callback is the
  // authoritative signal that the session is open.
  const [cameraReady, setCameraReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const [screen, setScreen] = useState<Screen>('camera')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null)

  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle')
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [editedName, setEditedName] = useState('')
  const [editedCalories, setEditedCalories] = useState('')
  const [editedProtein, setEditedProtein] = useState('')
  const [editedCarbs, setEditedCarbs] = useState('')
  const [editedFat, setEditedFat] = useState('')
  const [mealDate, setMealDate] = useState(() => new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady || capturing) return
    setCapturing(true)
    setCaptureError(null)
    try {
      // Request base64 directly — avoids a separate FileSystem.readAsStringAsync
      // call and eliminates any file-path timing issues on Android.
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      })
      if (!photo?.uri || !photo.base64) {
        setCaptureError('Could not capture photo. Please try again.')
        return
      }
      setCapturedUri(photo.uri)
      setCapturedBase64(photo.base64)
      setScreen('preview')
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : 'Capture failed. Please try again.'
      )
    } finally {
      setCapturing(false)
    }
  }

  function handleRetake() {
    setCapturedUri(null)
    setCapturedBase64(null)
    setScreen('camera')
    setAnalyzeState('idle')
    setAnalysisResult(null)
    setAnalysisError(null)
    setEditedName('')
    setEditedCalories('')
    setEditedProtein('')
    setEditedCarbs('')
    setEditedFat('')
    setMealDate(new Date())
    setShowDatePicker(false)
    setSaving(false)
    setSaveError(null)
    setCaptureError(null)
  }

  async function handleAnalyze() {
    if (!capturedBase64) return
    setAnalyzeState('loading')
    setAnalysisError(null)
    const res = await analyzeFood(capturedBase64)
    if ('error' in res) {
      setAnalysisError(res.error)
      setAnalyzeState('error')
    } else {
      setAnalysisResult(res.data)
      setEditedName(res.data.name)
      setEditedCalories(String(res.data.calories))
      setEditedProtein(String(res.data.protein))
      setEditedCarbs(String(res.data.carbs))
      setEditedFat(String(res.data.fat))
      setAnalyzeState('done')
    }
  }

  function hasUserEdits(): boolean {
    if (!analysisResult) return false
    return (
      editedName !== analysisResult.name ||
      editedCalories !== String(analysisResult.calories) ||
      editedProtein !== String(analysisResult.protein) ||
      editedCarbs !== String(analysisResult.carbs) ||
      editedFat !== String(analysisResult.fat)
    )
  }

  function handleAnalyzePress() {
    Keyboard.dismiss()
    if (analysisResult && hasUserEdits()) {
      Alert.alert(
        'Replace your edits?',
        'Re-analyzing will replace your edits.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-analyze', style: 'destructive', onPress: handleAnalyze },
        ],
      )
      return
    }
    handleAnalyze()
  }

  async function handleSave() {
    if (!analysisResult) return
    setSaving(true)
    setSaveError(null)

    const name = editedName.trim()
    const calories = parseRequiredNumber(editedCalories)
    const protein = parseRequiredNumber(editedProtein)
    const carbs = parseRequiredNumber(editedCarbs)
    const fat = parseRequiredNumber(editedFat)

    if (!name || calories === null || protein === null || carbs === null || fat === null) {
      setSaveError('Please enter a meal name and valid nutrition values.')
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveError('Not authenticated.'); setSaving(false); return }

    const { error } = await supabase.from('meals').insert({
      user_id: user.id,
      name,
      calories: Math.round(calories),
      protein,
      carbs,
      fat,
      date: toISO(mealDate),
    })

    if (error) {
      setSaveError(error.message)
      setSaving(false)
    } else {
      router.replace('/(tabs)')
    }
  }

  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionScreen]}>
        <SafeAreaView style={styles.permissionInner}>
          <Feather name="camera-off" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.permissionText}>
            Camera access is required to log food.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {screen === 'camera' ? 'What did you eat?' : 'Looks good?'}
        </Text>
      </SafeAreaView>

      {/* Viewfinder / preview */}
      <View style={styles.viewfinder}>
        {screen === 'camera' ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            onMountError={(e) => setCaptureError(e.message)}
          />
        ) : capturedUri ? (
          <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
      </View>

      {/* Bottom controls */}
      <SafeAreaView style={styles.controls}>
        {screen === 'camera' ? (
          <View style={styles.cameraControls}>
            {/* Capture error — shown above the shutter button */}
            {captureError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{captureError}</Text>
              </View>
            )}

            {/* Camera initialising hint */}
            {!cameraReady && !captureError && (
              <View style={styles.hintRow}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                <Text style={styles.hintText}>Preparing camera…</Text>
              </View>
            )}

            <View style={styles.captureRow}>
              <TouchableOpacity
                onPress={handleCapture}
                style={[
                  styles.captureButton,
                  (!cameraReady || capturing) && styles.captureButtonDisabled,
                ]}
                disabled={!cameraReady || capturing}
                accessibilityLabel="Take photo"
              >
                {capturing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <View style={styles.captureInner} />}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.previewControls}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Analysis result card */}
            {analyzeState === 'done' && analysisResult && (
              <View style={styles.resultCard}>
                <TextInput
                  style={styles.resultNameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Meal name"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  selectTextOnFocus
                />
                <Text style={styles.aiEstimateLabel}>AI estimate - tap to edit</Text>
                <View style={styles.macroGrid}>
                  {([
                    { label: 'Calories', value: editedCalories, setValue: setEditedCalories, unit: 'kcal', keyboardType: 'number-pad' as const },
                    { label: 'Protein', value: editedProtein, setValue: setEditedProtein, unit: 'g', keyboardType: 'decimal-pad' as const },
                    { label: 'Carbs', value: editedCarbs, setValue: setEditedCarbs, unit: 'g', keyboardType: 'decimal-pad' as const },
                    { label: 'Fat', value: editedFat, setValue: setEditedFat, unit: 'g', keyboardType: 'decimal-pad' as const },
                  ]).map(({ label, value, setValue, unit, keyboardType }) => (
                    <View key={label} style={styles.macroCell}>
                      <View style={styles.macroInputRow}>
                        <TextInput
                          style={styles.macroCellInput}
                          value={value}
                          onChangeText={setValue}
                          keyboardType={keyboardType}
                          placeholder="0"
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                          selectTextOnFocus
                        />
                        <Text style={styles.macroCellUnit}>{unit}</Text>
                      </View>
                      <Text style={styles.macroCellLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      Keyboard.dismiss()
                      setShowDatePicker(true)
                    }}
                    accessibilityLabel="Edit meal date"
                  >
                    <Text style={styles.dateInputText}>{toISO(mealDate)}</Text>
                    <Feather name="calendar" size={14} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="slide">
                <View style={styles.pickerModal}>
                  <View style={styles.pickerCard}>
                    <DateTimePicker
                      value={mealDate}
                      mode="date"
                      display="inline"
                      themeVariant="dark"
                      onChange={(_, d) => { if (d) setMealDate(d) }}
                    />
                    <TouchableOpacity
                      style={styles.pickerDone}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={mealDate}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowDatePicker(false)
                  if (d) setMealDate(d)
                }}
              />
            )}

            {/* Error message */}
            {(analysisError || saveError) && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{analysisError ?? saveError}</Text>
              </View>
            )}

            {/* Save — shown after analysis */}
            {analyzeState === 'done' && (
              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.buttonDisabled]}
                onPress={() => {
                  Keyboard.dismiss()
                  handleSave()
                }}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#18181b" size="small" />
                  : <Text style={styles.primaryButtonText}>Save Meal</Text>}
              </TouchableOpacity>
            )}

            {/* Retake / Analyze row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Keyboard.dismiss()
                  handleRetake()
                }}
              >
                <Text style={styles.secondaryButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.flex1, analyzeState === 'loading' && styles.buttonDisabled]}
                onPress={() => {
                  handleAnalyzePress()
                }}
                disabled={analyzeState === 'loading'}
              >
                {analyzeState === 'loading'
                  ? <ActivityIndicator color="#18181b" size="small" />
                  : <Text style={styles.primaryButtonText}>
                      {analyzeState === 'done' ? 'Re-analyze' : 'Analyze'}
                    </Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 12,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 14, fontWeight: '500', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  viewfinder: { flex: 1, overflow: 'hidden' },
  controls: {
    backgroundColor: '#000',
    paddingHorizontal: 24, paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 8,
  },
  cameraControls: { gap: 12 },
  hintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  hintText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  captureRow: { alignItems: 'center', paddingVertical: 8 },
  captureButton: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureButtonDisabled: { opacity: 0.4 },
  captureInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
  },
  previewControls: { gap: 10, paddingBottom: 4 },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 14,
  },
  resultNameInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  aiEstimateLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    textAlign: 'center',
  },
  macroGrid: { flexDirection: 'row', gap: 6 },
  macroCell: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    marginBottom: 2,
  },
  macroCellInput: {
    minWidth: 24,
    maxWidth: 50,
    padding: 0,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  macroCellUnit: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  macroCellLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  dateField: { marginTop: 12 },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  pickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  pickerDone: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 20 },
  pickerDoneText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  errorCard: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 12,
  },
  errorText: { fontSize: 13, color: '#fca5a5', textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 14, fontWeight: '600', color: '#18181b' },
  secondaryButton: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  buttonDisabled: { opacity: 0.5 },
  permissionScreen: { justifyContent: 'center', alignItems: 'center' },
  permissionInner: { alignItems: 'center', paddingHorizontal: 40, gap: 16 },
  permissionText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  permissionButton: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  permissionButtonText: { fontSize: 14, fontWeight: '600', color: '#18181b' },
  backLink: { marginTop: 4 },
  backLinkText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
})
