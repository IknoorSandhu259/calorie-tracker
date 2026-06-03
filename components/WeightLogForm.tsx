'use client'

import { useActionState, useEffect, useRef } from 'react'
import { saveWeightLog, type WeightActionState } from '@/lib/actions/weight'

const initialState: WeightActionState = {}

export default function WeightLogForm() {
  const [state, formAction, pending] = useActionState(saveWeightLog, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Populate the hidden log_date with the user's local date (YYYY-MM-DD)
  useEffect(() => {
    const input = formRef.current?.elements.namedItem('log_date') as HTMLInputElement | null
    if (input) {
      const pad = (n: number) => String(n).padStart(2, '0')
      const d = new Date()
      input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
  }, [])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 max-w-sm">
      <input type="hidden" name="log_date" />

      <label className="flex flex-col gap-1 text-sm font-medium">
        Weight (kg)
        <input
          type="number"
          name="weight_kg"
          step="0.1"
          min="20"
          max="500"
          required
          className="border rounded px-3 py-2 text-base"
          placeholder="e.g. 79.5"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save entry'}
      </button>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-700" role="status">Weight saved.</p>
      )}
    </form>
  )
}
