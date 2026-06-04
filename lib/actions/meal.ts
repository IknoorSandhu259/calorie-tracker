'use server'

import { createClient } from '@/lib/supabase/server'
import type { FoodAnalysis } from './analyze'
import type { MealInsert } from '@/lib/supabase/types'

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

  const meal: MealInsert = {
    user_id: user.id,
    name: analysis.name,
    calories: analysis.calories,
    protein: analysis.protein,
    carbs: analysis.carbs,
    fat: analysis.fat,
    date: todayISO(),
  }

  const { error } = await supabase.from('meals').insert(meal)

  if (error) return { error: error.message }
  return { success: true }
}

export async function addMealManual(
  name: string,
  calories: number,
  date: string,
  protein: number | null,
  carbs: number | null,
  fat: number | null,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  const meal: MealInsert = {
    user_id: user.id,
    name: name.trim(),
    calories,
    date,
    ...(protein !== null && { protein }),
    ...(carbs !== null && { carbs }),
    ...(fat !== null && { fat }),
  }

  const { error } = await supabase.from('meals').insert(meal)

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
