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

type Point = { date: string; weight: number | null }

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

export default function WeightChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = useDarkMode()

  const c = dark
    ? { grid: '#3f3f46', tick: '#71717a', tooltipBg: '#27272a', tooltipBorder: '#3f3f46', tooltipText: '#fafafa', line: '#f4f4f5' }
    : { grid: '#f4f4f5', tick: '#a1a1aa', tooltipBg: '#ffffff', tooltipBorder: '#e4e4e7', tooltipText: '#18181b', line: '#18181b' }

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
    <div className="min-w-0">
      <ResponsiveContainer width="100%" height={192}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: c.tick }}
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: c.tick }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${c.tooltipBorder}`,
            backgroundColor: c.tooltipBg,
            color: c.tooltipText,
          }}
          formatter={(v) => [`${v} kg`, 'Weight']}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={c.line}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: c.line }}
        />
      </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
