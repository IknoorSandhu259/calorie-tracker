import { useCallback, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Platform, SafeAreaView,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as FileSystem from 'expo-file-system'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { analyzeFood, type FoodAnalysis } from '../lib/analyzeFood'
import { supabase } from '../lib/supabase'

type Screen = 'camera' | 'preview'
type AnalyzeState = 'idle' | 'loading' | 'done' | 'error'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const [screen, setScreen] = useState<Screen>('camera')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null)

  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle')
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleCapture() {
    if (!cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92 })
      if (!photo?.uri) return
      // Read as base64 for Gemini
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      setCapturedUri(photo.uri)
      setCapturedBase64(base64)
      setScreen('preview')
    } catch {
      // Camera not ready — ignore
    }
  }

  function handleRetake() {
    setCapturedUri(null)
    setCapturedBase64(null)
    setScreen('camera')
    setAnalyzeState('idle')
    setAnalysisResult(null)
    setAnalysisError(null)
    setSaving(false)
    setSaveError(null)
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
      setAnalyzeState('done')
    }
  }

  async function handleSave() {
    if (!analysisResult) return
    setSaving(true)
    setSaveError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveError('Not authenticated.'); setSaving(false); return }

    const { error } = await supabase.from('meals').insert({
      user_id: user.id,
      name: analysisResult.name,
      calories: analysisResult.calories,
      protein: analysisResult.protein,
      carbs: analysisResult.carbs,
      fat: analysisResult.fat,
      date: todayISO(),
    })

    if (error) {
      setSaveError(error.message)
      setSaving(false)
    } else {
      router.replace('/(tabs)')
    }
  }

  // Permission loading
  if (!permission) {
    return <View style={styles.container} />
  }

  // Permission denied
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
    <View style={styles.container}>
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
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : capturedUri ? (
          <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
      </View>

      {/* Bottom controls */}
      <SafeAreaView style={styles.controls}>
        {screen === 'camera' ? (
          <View style={styles.captureRow}>
            <TouchableOpacity
              onPress={handleCapture}
              style={styles.captureButton}
              accessibilityLabel="Take photo"
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewControls}>
            {/* Analysis result card */}
            {analyzeState === 'done' && analysisResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultName}>{analysisResult.name}</Text>
                <View style={styles.macroGrid}>
                  {([
                    { label: 'Calories', value: `${analysisResult.calories}`, unit: 'kcal' },
                    { label: 'Protein',  value: `${analysisResult.protein}`,  unit: 'g' },
                    { label: 'Carbs',    value: `${analysisResult.carbs}`,    unit: 'g' },
                    { label: 'Fat',      value: `${analysisResult.fat}`,      unit: 'g' },
                  ]).map(({ label, value, unit }) => (
                    <View key={label} style={styles.macroCell}>
                      <Text style={styles.macroCellValue}>
                        {value}<Text style={styles.macroCellUnit}>{unit}</Text>
                      </Text>
                      <Text style={styles.macroCellLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
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
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#18181b" size="small" />
                  : <Text style={styles.primaryButtonText}>Save Meal</Text>}
              </TouchableOpacity>
            )}

            {/* Retake / Analyze row */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
                <Text style={styles.secondaryButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.flex1, analyzeState === 'loading' && styles.buttonDisabled]}
                onPress={handleAnalyze}
                disabled={analyzeState === 'loading'}
              >
                {analyzeState === 'loading'
                  ? <ActivityIndicator color="#18181b" size="small" />
                  : <Text style={styles.primaryButtonText}>
                      {analyzeState === 'done' ? 'Re-analyze' : 'Analyze'}
                    </Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
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
  captureRow: { alignItems: 'center', paddingVertical: 16 },
  captureButton: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff',
  },
  previewControls: { gap: 10 },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 14,
  },
  resultName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  macroGrid: { flexDirection: 'row', gap: 6 },
  macroCell: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  macroCellValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  macroCellUnit: { fontSize: 10, fontWeight: '400' },
  macroCellLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  errorCard: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 12,
  },
  errorText: { fontSize: 13, color: '#fca5a5' },
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
