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

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

export default function CalorieChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = useDarkMode()

  const c = dark
    ? { grid: '#3f3f46', tick: '#71717a', tooltipBg: '#27272a', tooltipBorder: '#3f3f46', tooltipText: '#fafafa', bar: '#f4f4f5' }
    : { grid: '#f4f4f5', tick: '#a1a1aa', tooltipBg: '#ffffff', tooltipBorder: '#e4e4e7', tooltipText: '#18181b', bar: '#18181b' }

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
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: c.tick }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: c.tick }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${c.tooltipBorder}`,
            backgroundColor: c.tooltipBg,
            color: c.tooltipText,
          }}
          formatter={(v) => [`${v} kcal`, 'Calories']}
        />
        <Bar dataKey="calories" fill={c.bar} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
