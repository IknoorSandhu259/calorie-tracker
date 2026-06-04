import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg'

type Point = { date: string; calories: number }

const H = 192
const PAD = { top: 16, right: 12, bottom: 28, left: 44 }

export default function CalorieChart({ data }: { data: Point[] }) {
  const [w, setW] = useState(0)

  if (data.every(d => d.calories === 0)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No calorie data yet</Text>
      </View>
    )
  }

  const cW = w - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const maxCal = Math.max(...data.map(d => d.calories), 1)
  const slotW = cW / data.length
  const barW = Math.min(slotW * 0.6, 40)

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map(t => {
            const y = PAD.top + t * cH
            const label = Math.round(maxCal * (1 - t))
            return (
              <Line key={t} x1={PAD.left} y1={y} x2={w - PAD.right} y2={y}
                stroke="#f4f4f5" strokeWidth={1} />
            )
          })}

          {/* Y labels */}
          {[0, 0.5, 1].map(t => {
            const y = PAD.top + t * cH
            const label = Math.round(maxCal * (1 - t))
            return (
              <SvgText key={t} x={PAD.left - 4} y={y + 4}
                textAnchor="end" fontSize={9} fill="#a1a1aa">
                {label}
              </SvgText>
            )
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const barH = (d.calories / maxCal) * cH
            const x = PAD.left + i * slotW + (slotW - barW) / 2
            const y = PAD.top + cH - barH
            return (
              <Rect key={i} x={x} y={y} width={barW} height={Math.max(barH, 0)}
                rx={3} ry={3} fill="#18181b" />
            )
          })}

          {/* X labels */}
          {data.map((d, i) => (
            <SvgText
              key={i}
              x={PAD.left + i * slotW + slotW / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#a1a1aa"
            >
              {d.date}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { height: H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#a1a1aa' },
})
