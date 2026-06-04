'use server'

import { createClient } from '@/lib/supabase/server'
import type { WeightLogInsert } from '@/lib/supabase/types'

export type WeightActionState = {
  error?: string
  success?: boolean
}

export async function saveWeightLog(
  _prevState: WeightActionState,
  formData: FormData
): Promise<WeightActionState> {
  const weightStr = formData.get('weight_kg') as string
  const logDate = formData.get('log_date') as string

  const weight = parseFloat(weightStr)
  if (isNaN(weight) || weight < 20 || weight > 500) {
    return { error: 'Weight must be between 20 and 500 kg.' }
  }

  if (!logDate || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { error: 'Invalid date.' }
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Not authenticated.' }
  }

  const weightLog: WeightLogInsert = {
    user_id: user.id,
    date: logDate,
    weight,
  }

  const { error } = await supabase
    .from('weight_logs')
    .upsert(weightLog, { onConflict: 'user_id,date' })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
