'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Point = { date: string; weight: number }

export default function WeightChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="h-48 animate-pulse rounded-xl bg-zinc-100" />
  }

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        No weight data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#a1a1aa' }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
          formatter={(v) => [`${v} kg`, 'Weight']}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#18181b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
