'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Point = { date: string; calories: number }

export default function CalorieChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-48 animate-pulse rounded-xl bg-zinc-100" />
  }

  if (data.every((d) => d.calories === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        No calorie data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
          formatter={(v) => [`${v} kcal`, 'Calories']}
        />
        <Bar dataKey="calories" fill="#18181b" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
