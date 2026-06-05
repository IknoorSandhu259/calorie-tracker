'use no memo'

import { useRef, useState } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg'
import { useTheme } from '../constants/colors'

export type WPoint = { date: string; weight: number | null }

// ─── Layout ──────────────────────────────────────────────────────────────────
const H          = 192
const PAD_TOP    = 16
const PAD_BOTTOM = 28
const PAD_LEFT   = 44
const PAD_RIGHT  = 12
const cH         = H - PAD_TOP - PAD_BOTTOM

const DOT_R   = 4
const HOLD_MS = 150

export default function WeightChart({ data }: { data: WPoint[] }) {
  const c = useTheme()
  const [svgW, setSvgW]           = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Mutable refs accessible inside stale PanResponder closures ─────────────
  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startXRef       = useRef(0)
  const isInspectingRef = useRef(false)
  // Mirrors activeIndex so the PanResponder can compare without a re-render.
  const activeIndexRef  = useRef<number | null>(null)

  // This function is re-assigned on every render so it always uses the current
  // svgW and data. PanResponder callbacks read it through getIndexRef so they
  // always call the freshest version, despite being created only once.
  const getIndexRef = useRef<(x: number) => number | null>(() => null)
  getIndexRef.current = (x: number): number | null => {
    if (svgW === 0 || data.length === 0) return null
    const cW = svgW - PAD_LEFT - PAD_RIGHT
    const raw =
      data.length === 1
        ? 0
        : Math.max(0, Math.min(data.length - 1,
            Math.round(((x - PAD_LEFT) / cW) * (data.length - 1))))
    // Snap to the nearest non-null slot so we always show a real measurement.
    let best = -1, bestDist = Infinity
    for (let i = 0; i < data.length; i++) {
      if (data[i].weight !== null) {
        const d = Math.abs(i - raw)
        if (d < bestDist) { bestDist = d; best = i }
      }
    }
    return best === -1 ? null : best
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
        // gs.dx is screen-relative horizontal displacement; locationX is
        // view-relative and drifts when the parent ScrollView shifts the chart
        // under the finger. Using startX + gs.dx means vertical finger movement
        // (and any vertical view shift) has zero effect on the crosshair.
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

  // ── Empty / no-data states ──────────────────────────────────────────────────
  const hasAny = data.some(d => d.weight !== null)
  if (data.length === 0 || !hasAny) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: c.textLabel }]}>No weight data yet</Text>
      </View>
    )
  }

  // ── Chart geometry ───────────────────────────────────────────────────────────
  const cW = svgW - PAD_LEFT - PAD_RIGHT

  const nonNullW = data.filter(d => d.weight !== null).map(d => d.weight as number)
  const minW     = Math.min(...nonNullW)
  const maxW     = Math.max(...nonNullW)
  const wRange   = maxW - minW || 1

  const xOf = (i: number) =>
    PAD_LEFT + (data.length > 1 ? (i / (data.length - 1)) : 0.5) * cW

  const yOf = (val: number) =>
    PAD_TOP + (1 - (val - minW) / wRange) * cH

  // Build line segments — null slots create visible gaps.
  const segments: string[] = []
  let cur: string[] = []
  for (let i = 0; i < data.length; i++) {
    const wt = data[i].weight
    if (wt !== null) {
      cur.push(`${xOf(i)},${yOf(wt)}`)
    } else {
      if (cur.length >= 2) segments.push(cur.join(' '))
      cur = []
    }
  }
  if (cur.length >= 2) segments.push(cur.join(' '))

  const activePt = activeIndex !== null ? data[activeIndex] : null

  // Show ~5 evenly spaced x-axis labels.
  const labelStep = Math.ceil(data.length / 5)
  const showLabel = (i: number) =>
    data.length <= 7 || i === 0 || i === data.length - 1 || i % labelStep === 0

  const dimOp = 0.3

  return (
    <View>
      {/* ── Fixed header — value displayed above the chart, never under thumb ── */}
      <View style={styles.header}>
        {activePt ? (
          <View style={styles.headerRow}>
            <Text style={[styles.headerDate, { color: c.textMuted }]}>{activePt.date}</Text>
            <Text style={[styles.headerValue, { color: c.textPrimary }]}>
              {activePt.weight != null ? `${activePt.weight} kg` : '—'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.headerHint, { color: c.textLabel }]}>Hold &amp; drag to inspect</Text>
        )}
      </View>

      <View {...pan.panHandlers} onLayout={e => setSvgW(e.nativeEvent.layout.width)}>
        {svgW > 0 && (
          <Svg width={svgW} height={H}>
            {/* Y-axis labels */}
            {[0, 0.5, 1].map(t => (
              <SvgText key={t}
                x={PAD_LEFT - 4} y={PAD_TOP + t * cH + 4}
                textAnchor="end" fontSize={9} fill={c.chartTick}
              >
                {(maxW - t * wRange).toFixed(1)}
              </SvgText>
            ))}

            {/* Horizontal grid lines */}
            {[0, 0.5, 1].map(t => (
              <Line key={t}
                x1={PAD_LEFT} y1={PAD_TOP + t * cH}
                x2={svgW - PAD_RIGHT} y2={PAD_TOP + t * cH}
                stroke={c.chartGrid} strokeWidth={1}
              />
            ))}

            {/* Line segments — gaps at null slots */}
            {segments.map((pts, si) => (
              <Polyline key={si}
                points={pts}
                fill="none" stroke={c.chartLine}
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                opacity={activeIndex !== null ? dimOp : 1}
              />
            ))}

            {/* Dots for non-null, non-active points */}
            {data.map((d, i) =>
              d.weight !== null && i !== activeIndex && (
                <Circle key={i}
                  cx={xOf(i)} cy={yOf(d.weight)} r={DOT_R}
                  fill={c.chartLine}
                  opacity={activeIndex !== null ? dimOp : 1}
                />
              )
            )}

            {/* X-axis labels */}
            {data.map((d, i) =>
              showLabel(i) && (
                <SvgText key={i}
                  x={xOf(i)} y={H - 4}
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                  fontSize={9} fill={c.chartTick}
                >
                  {d.date}
                </SvgText>
              )
            )}

            {/* Crosshair */}
            {activeIndex !== null && data[activeIndex].weight !== null && (() => {
              const cx = xOf(activeIndex)
              const cy = yOf(data[activeIndex].weight as number)
              return (
                <G>
                  <Line
                    x1={cx} y1={PAD_TOP} x2={cx} y2={PAD_TOP + cH}
                    stroke={c.chartLine} strokeWidth={1}
                    strokeDasharray="3,3" strokeOpacity={0.6}
                  />
                  <Circle cx={cx} cy={cy} r={DOT_R + 4} fill={c.cardBg} />
                  <Circle cx={cx} cy={cy} r={DOT_R + 2} fill={c.chartLine} />
                </G>
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
  emptyWrap:   { height: H + HEADER_H, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { fontSize: 14 },
  header:      { height: HEADER_H, paddingHorizontal: PAD_LEFT, justifyContent: 'center' },
  headerRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  headerDate:  { fontSize: 12 },
  headerValue: { fontSize: 22, fontWeight: '700' },
  headerHint:  { fontSize: 12, textAlign: 'center', opacity: 0.6 },
})
