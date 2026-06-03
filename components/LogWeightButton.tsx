'use client'

import { useState } from 'react'
import WeightModal from './WeightModal'

export default function LogWeightButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && <WeightModal onClose={() => setOpen(false)} />}

      <button
        onClick={() => setOpen(true)}
        aria-label="Log weight"
        className="fixed bottom-24 right-5 flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-700 active:scale-95 transition-transform"
      >
        Log Weight
      </button>
    </>
  )
}
