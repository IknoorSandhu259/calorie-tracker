import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

const RADIUS = 52
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SIZE = 144

interface Props {
  consumed: number
  goal: number
}

export default function CalorieRing({ consumed, goal }: Props) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const dashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <View style={styles.wrapper}>
      <View style={styles.ring}>
        {/* Rotated -90° so progress starts at 12 o'clock */}
        <Svg
          width={SIZE}
          height={SIZE}
          viewBox="0 0 124 124"
          style={styles.svg}
        >
          {/* Track */}
          <Circle
            cx="62"
            cy="62"
            r={RADIUS}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={STROKE}
          />
          {/* Progress fill */}
          <Circle
            cx="62"
            cy="62"
            r={RADIUS}
            fill="none"
            stroke="#18181b"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashoffset}
          />
        </Svg>

        {/* Centre label */}
        <View style={styles.centre}>
          <Text style={styles.number}>{consumed.toLocaleString()}</Text>
          <Text style={styles.unit}>kcal</Text>
        </View>
      </View>

      <Text style={styles.subtext}>
        {consumed.toLocaleString()} / {goal.toLocaleString()} kcal
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  centre: {
    alignItems: 'center',
  },
  number: {
    fontSize: 26,
    fontWeight: '700',
    color: '#18181b',
    lineHeight: 30,
  },
  unit: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  subtext: {
    fontSize: 14,
    color: '#71717a',
  },
})
