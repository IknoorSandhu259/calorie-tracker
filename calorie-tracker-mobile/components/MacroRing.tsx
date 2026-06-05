import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../constants/colors'

const RADIUS = 28
const STROKE = 6
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SIZE = 72

interface Props {
  label: string
  consumed: number
  goal: number
  color: string
}

export default function MacroRing({ label, consumed, goal, color }: Props) {
  const c = useTheme()
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const dashoffset = CIRCUMFERENCE * (1 - progress)
  const display = Math.round(consumed)

  return (
    <View style={styles.wrapper}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 70 70" style={styles.svg}>
          <Circle
            cx="35" cy="35" r={RADIUS}
            fill="none" stroke={c.border} strokeWidth={STROKE}
          />
          <Circle
            cx="35" cy="35" r={RADIUS}
            fill="none" stroke={color} strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashoffset}
          />
        </Svg>
        <View style={styles.centre}>
          <Text style={[styles.number, { color: c.textPrimary }]}>{display}</Text>
          <Text style={[styles.unit, { color: c.textMuted }]}>g</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: c.textLabel }]}>{label}</Text>
      <Text style={[styles.sub, { color: c.textLabel }]}>{display}/{goal}g</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 3 },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  centre: { alignItems: 'center' },
  number: { fontSize: 13, fontWeight: '700', lineHeight: 16 },
  unit: { fontSize: 9, marginTop: 1 },
  label: {
    fontSize: 9, fontWeight: '600',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  sub: { fontSize: 9 },
})
