'use server'

import { createClient } from '@/lib/supabase/server'
import type { FoodAnalysis } from './analyze'

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export async function saveMeal(
  analysis: FoodAnalysis
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('meals').insert({
    user_id: user.id,
    name: analysis.name,
    calories: analysis.calories,
    protein: analysis.protein,
    carbs: analysis.carbs,
    fat: analysis.fat,
    date: todayISO(),
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteMeal(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
