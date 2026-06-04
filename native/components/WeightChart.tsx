import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg'

type Point = { date: string; weight: number }

const H = 192
const PAD = { top: 16, right: 12, bottom: 28, left: 44 }

export default function WeightChart({ data }: { data: Point[] }) {
  const [w, setW] = useState(0)

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No weight data yet</Text>
      </View>
    )
  }

  const cW = w - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const weights = data.map(d => d.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const xOf = (i: number) =>
    PAD.left + (data.length > 1 ? (i / (data.length - 1)) : 0.5) * cW

  const yOf = (val: number) =>
    PAD.top + (1 - (val - minW) / range) * cH

  const points = data.map((d, i) => `${xOf(i)},${yOf(d.weight)}`).join(' ')

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {/* Grid lines */}
          {[0, 0.5, 1].map(t => {
            const y = PAD.top + t * cH
            const label = (maxW - t * range).toFixed(1)
            return (
              <Line key={t} x1={PAD.left} y1={y} x2={w - PAD.right} y2={y}
                stroke="#f4f4f5" strokeWidth={1} />
            )
          })}

          {/* Y labels */}
          {[0, 0.5, 1].map(t => {
            const y = PAD.top + t * cH
            const label = (maxW - t * range).toFixed(1)
            return (
              <SvgText key={t} x={PAD.left - 4} y={y + 4}
                textAnchor="end" fontSize={9} fill="#a1a1aa">
                {label}
              </SvgText>
            )
          })}

          {/* Line */}
          {data.length > 1 && (
            <Polyline
              points={points}
              fill="none"
              stroke="#18181b"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X labels: first and last */}
          <SvgText x={xOf(0)} y={H - 4} textAnchor="middle" fontSize={9} fill="#a1a1aa">
            {data[0].date}
          </SvgText>
          {data.length > 1 && (
            <SvgText x={xOf(data.length - 1)} y={H - 4} textAnchor="middle" fontSize={9} fill="#a1a1aa">
              {data[data.length - 1].date}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { height: H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#a1a1aa' },
})
