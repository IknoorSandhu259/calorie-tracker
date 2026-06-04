'use client'

import { useEffect } from 'react'

export function applyTheme(theme: string) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export default function ThemeSync() {
  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'system'
    applyTheme(saved)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onSystemChange() {
      if ((localStorage.getItem('theme') ?? 'system') === 'system') {
        applyTheme('system')
      }
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  return null
}
