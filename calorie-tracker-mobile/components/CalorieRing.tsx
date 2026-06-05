import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../constants/colors'

const RADIUS = 52
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SIZE = 144

interface Props {
  consumed: number
  goal: number
}

export default function CalorieRing({ consumed, goal }: Props) {
  const c = useTheme()
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const dashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <View style={styles.wrapper}>
      <View style={styles.ring}>
        <Svg
          width={SIZE}
          height={SIZE}
          viewBox="0 0 124 124"
          style={styles.svg}
        >
          {/* Track */}
          <Circle
            cx="62" cy="62" r={RADIUS}
            fill="none" stroke={c.border} strokeWidth={STROKE}
          />
          {/* Progress fill */}
          <Circle
            cx="62" cy="62" r={RADIUS}
            fill="none" stroke={c.chartLine} strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashoffset}
          />
        </Svg>

        <View style={styles.centre}>
          <Text style={[styles.number, { color: c.textPrimary }]}>
            {consumed.toLocaleString()}
          </Text>
          <Text style={[styles.unit, { color: c.textMuted }]}>kcal</Text>
        </View>
      </View>

      <Text style={[styles.subtext, { color: c.textMuted }]}>
        {consumed.toLocaleString()} / {goal.toLocaleString()} kcal
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 12 },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  centre: { alignItems: 'center' },
  number: { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  unit: { fontSize: 12, marginTop: 2 },
  subtext: { fontSize: 14 },
})
