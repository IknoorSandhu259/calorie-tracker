'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeFood, type FoodAnalysis } from '@/lib/actions/analyze'

type Screen = 'camera' | 'preview'
type AnalyzeState = 'idle' | 'loading' | 'done' | 'error'

export default function CameraView() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [screen, setScreen] = useState<Screen>('camera')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle')
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        // Explicit play() is needed on some browsers when srcObject is set
        // programmatically, even with the autoPlay attribute.
        await video.play().catch(() => {})
      }
    } catch (err) {
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera access denied. Allow camera access in your browser settings.'
          : 'Could not start camera.'
      )
    }
  }, [])

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    // Use actual video dimensions; fall back if stream hasn't reported them yet.
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    // Guard against an empty canvas (would produce 'data:,')
    if (!dataUrl || dataUrl === 'data:,') return

    setCapturedImage(dataUrl)
    setScreen('preview')
    stopCamera()
  }

  function handleRetake() {
    setCapturedImage(null)
    setScreen('camera')
    setAnalyzeState('idle')
    setAnalysisResult(null)
    setAnalysisError(null)
    startCamera()
  }

  async function handleAnalyze() {
    if (!capturedImage) return
    setAnalyzeState('loading')
    setAnalysisError(null)
    const res = await analyzeFood(capturedImage)
    if ('error' in res) {
      setAnalysisError(res.error)
      setAnalyzeState('error')
    } else {
      setAnalysisResult(res.data)
      setAnalyzeState('done')
    }
  }

  function handleBack() {
    stopCamera()
    router.back()
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pb-4 pt-12">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-medium text-white drop-shadow">
          {screen === 'camera' ? 'What did you eat?' : 'Looks good?'}
        </span>
      </div>

      {/* Viewfinder / preview */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          className={`h-full w-full object-cover${screen === 'preview' ? ' hidden' : ''}`}
        />

        {screen === 'preview' && capturedImage && (
          <img
            src={capturedImage}
            alt="Captured food"
            className="h-full w-full object-cover"
          />
        )}

        {/* Permission / device error */}
        {error && screen === 'camera' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{error}</p>
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Bottom controls */}
      <div className="flex flex-col gap-3 px-8 pb-16 pt-6">
        {screen === 'camera' ? (
          <div className="flex justify-center">
            <button
              onClick={handleCapture}
              disabled={!!error}
              aria-label="Take photo"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-30"
            >
              <div className="h-14 w-14 rounded-full bg-white" />
            </button>
          </div>
        ) : (
          <>
            {/* Result panel */}
            {analyzeState === 'done' && analysisResult && (
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{analysisResult.name}</p>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {(
                    [
                      { label: 'Calories', value: String(analysisResult.calories), unit: 'kcal' },
                      { label: 'Protein',  value: String(analysisResult.protein),  unit: 'g' },
                      { label: 'Carbs',    value: String(analysisResult.carbs),    unit: 'g' },
                      { label: 'Fat',      value: String(analysisResult.fat),      unit: 'g' },
                    ] as const
                  ).map(({ label, value, unit }) => (
                    <div key={label} className="flex flex-col items-center rounded-xl bg-white/10 py-2">
                      <span className="text-sm font-bold text-white">{value}<span className="text-[10px] font-normal">{unit}</span></span>
                      <span className="text-[10px] text-white/60">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {analyzeState === 'error' && analysisError && (
              <p className="rounded-2xl bg-red-500/20 px-4 py-3 text-xs text-red-300">
                {analysisError}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-2xl border border-white/30 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Retake
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzeState === 'loading'}
                className="flex-1 rounded-2xl bg-white py-4 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:opacity-60"
              >
                {analyzeState === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                    </svg>
                    Analyzing…
                  </span>
                ) : analyzeState === 'done' ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
