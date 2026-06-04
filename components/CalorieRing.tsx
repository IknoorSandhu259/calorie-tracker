const RADIUS = 52
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface Props {
  consumed: number
  goal: number
}

export default function CalorieRing({ consumed, goal }: Props) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const dashoffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-36 w-36">
        <svg
          viewBox="0 0 124 124"
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="62"
            cy="62"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-zinc-200"
          />
          {/* Fill */}
          <circle
            cx="62"
            cy="62"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            className="text-zinc-900"
          />
        </svg>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none text-zinc-900">
            {consumed.toLocaleString()}
          </span>
          <span className="mt-0.5 text-xs text-zinc-500">kcal</span>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        {consumed.toLocaleString()} / {goal.toLocaleString()} kcal
      </p>
    </div>
  )
}
