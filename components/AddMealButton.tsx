'use client'

import { useRouter } from 'next/navigation'

export default function AddMealButton({ returnTo = '/history' }: { returnTo?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.replace(`/add-meal?from=${encodeURIComponent(returnTo)}`)}
      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
    >
      Add Meal
    </button>
  )
}
