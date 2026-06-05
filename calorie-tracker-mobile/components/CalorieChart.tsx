'use no memo'

import { useRef, useState } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg'
import { useTheme } from '../constants/colors'

export type CPoint = { date: string; calories: number }

// ─── Layout ──────────────────────────────────────────────────────────────────
const H          = 192
const PAD_TOP    = 16
const PAD_BOTTOM = 28
const PAD_LEFT   = 44
const PAD_RIGHT  = 12
const cH         = H - PAD_TOP - PAD_BOTTOM

const BAR_FADED_OP = 0.25
const HOLD_MS      = 150

export default function CalorieChart({ data }: { data: CPoint[] }) {
  const c = useTheme()
  const [svgW, setSvgW]               = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Mutable refs accessible inside stale PanResponder closures ─────────────
  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startXRef       = useRef(0)
  const isInspectingRef = useRef(false)
  // Mirrors activeIndex so PanResponder can compare without a re-render.
  const activeIndexRef  = useRef<number | null>(null)

  // Re-assigned on every render so it always sees the current svgW and data.
  const getIndexRef = useRef<(x: number) => number | null>(() => null)
  getIndexRef.current = (x: number): number | null => {
    if (svgW === 0 || data.length === 0) return null
    const cW    = svgW - PAD_LEFT - PAD_RIGHT
    const slotW = cW / data.length
    if (slotW === 0) return null
    const i = Math.floor((x - PAD_LEFT) / slotW)
    return Math.max(0, Math.min(data.length - 1, i))
  }

  // ── PanResponder — created once, accesses live state only through refs ─────
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      // Yield to the parent ScrollView for vertical scrolls as long as
      // inspection hasn't activated yet.
      onPanResponderTerminationRequest: () => !isInspectingRef.current,

      onPanResponderGrant: evt => {
        startXRef.current = evt.nativeEvent.locationX
        holdTimerRef.current = setTimeout(() => {
          isInspectingRef.current = true
          const idx = getIndexRef.current(startXRef.current)
          if (idx !== activeIndexRef.current) {
            activeIndexRef.current = idx
            setActiveIndex(idx)
          }
        }, HOLD_MS)
      },

      onPanResponderMove: (_evt, gs) => {
        if (!isInspectingRef.current) {
          // Pre-activation: cancel hold if the gesture is clearly a vertical scroll.
          if (Math.abs(gs.dy) > 10 && Math.abs(gs.dy) > Math.abs(gs.dx)) {
            if (holdTimerRef.current) {
              clearTimeout(holdTimerRef.current)
              holdTimerRef.current = null
            }
          }
          return
        }

        // ── True X-axis lock ──────────────────────────────────────────────────
        // gs.dx is screen-relative horizontal displacement; startX + gs.dx gives
        // the current finger X in view coordinates. Vertical movement (gs.dy)
        // has zero effect — the bar only changes when the finger crosses into a
        // new horizontal slot.
        const newIdx = getIndexRef.current(startXRef.current + gs.dx)
        if (newIdx !== activeIndexRef.current) {
          activeIndexRef.current = newIdx
          setActiveIndex(newIdx)
        }
      },

      onPanResponderRelease: () => {
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
        isInspectingRef.current = false
        activeIndexRef.current  = null
        setActiveIndex(null)
      },

      onPanResponderTerminate: () => {
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
        isInspectingRef.current = false
        activeIndexRef.current  = null
        setActiveIndex(null)
      },
    })
  ).current

  if (data.every(d => d.calories === 0)) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: c.textLabel }]}>No calorie data yet</Text>
      </View>
    )
  }

  // ── Geometry ────────────────────────────────────────────────────────────────
  const cW     = svgW - PAD_LEFT - PAD_RIGHT
  const slotW  = cW / data.length
  const barW   = Math.min(slotW * 0.6, 48)
  const maxCal = Math.max(...data.map(d => d.calories), 1)

  const barCX = (i: number) => PAD_LEFT + i * slotW + slotW / 2

  const activePt = activeIndex !== null ? data[activeIndex] : null

  // ── X-axis label selection (~5 evenly spaced) ───────────────────────────────
  const labelStep = Math.ceil(data.length / 5)
  const showLabel = (i: number) =>
    data.length <= 7 || i === 0 || i === data.length - 1 || i % labelStep === 0

  return (
    <View>
      {/* ── Fixed inspection header — value displayed above the chart ── */}
      <View style={styles.header}>
        {activePt ? (
          <View style={styles.headerContent}>
            <Text style={[styles.headerDate, { color: c.textMuted }]}>{activePt.date}</Text>
            <Text style={[styles.headerValue, { color: c.textPrimary }]}>
              {activePt.calories > 0 ? `${activePt.calories} kcal` : 'No data'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.headerHint, { color: c.textLabel }]}>
            Hold &amp; drag to inspect
          </Text>
        )}
      </View>

      {/* ── Chart SVG ── */}
      <View
        {...pan.panHandlers}
        onLayout={e => setSvgW(e.nativeEvent.layout.width)}
      >
        {svgW > 0 && (
          <Svg width={svgW} height={H}>
            {/* Y-axis labels + grid */}
            {[0, 0.5, 1].map(t => {
              const y = PAD_TOP + t * cH
              return (
                <G key={t}>
                  <Line x1={PAD_LEFT} y1={y} x2={svgW - PAD_RIGHT} y2={y}
                    stroke={c.chartGrid} strokeWidth={1} />
                  <SvgText x={PAD_LEFT - 4} y={y + 4}
                    textAnchor="end" fontSize={9} fill={c.chartTick}>
                    {Math.round(maxCal * (1 - t))}
                  </SvgText>
                </G>
              )
            })}

            {/* Bars — zero-height bars render as nothing but preserve axis slot */}
            {data.map((d, i) => {
              const barH = (d.calories / maxCal) * cH
              const x    = PAD_LEFT + i * slotW + (slotW - barW) / 2
              const y    = PAD_TOP + cH - barH
              return (
                <Rect key={i}
                  x={x} y={y} width={barW} height={Math.max(barH, 0)}
                  rx={3} ry={3}
                  fill={c.chartLine}
                  opacity={activeIndex !== null && i !== activeIndex ? BAR_FADED_OP : 1}
                />
              )
            })}

            {/* X-axis labels at ~5 positions */}
            {data.map((d, i) =>
              showLabel(i) && (
                <SvgText key={i}
                  x={barCX(i)} y={H - 4}
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                  fontSize={9} fill={c.chartTick}
                >
                  {d.date}
                </SvgText>
              )
            )}

            {/* Crosshair — shown even on 0-calorie slots */}
            {activeIndex !== null && (() => {
              const cx = barCX(activeIndex)
              return (
                <Line
                  x1={cx} y1={PAD_TOP}
                  x2={cx} y2={PAD_TOP + cH}
                  stroke={c.chartLine} strokeWidth={1}
                  strokeDasharray="3,3" strokeOpacity={0.6}
                />
              )
            })()}
          </Svg>
        )}
      </View>
    </View>
  )
}

const HEADER_H = 48

const styles = StyleSheet.create({
  emptyWrap: { height: H + HEADER_H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },
  header: {
    height: HEADER_H,
    paddingHorizontal: PAD_LEFT,
    justifyContent: 'center',
  },
  headerContent: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  headerDate:  { fontSize: 12 },
  headerValue: { fontSize: 22, fontWeight: '700' },
  headerHint:  { fontSize: 12, textAlign: 'center', opacity: 0.6 },
})
