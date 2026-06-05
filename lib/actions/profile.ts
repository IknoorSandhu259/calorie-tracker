'use server'

import { createClient } from '@/lib/supabase/server'
import type { ProfileUpdate } from '@/lib/supabase/types'

export type GoalSet = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const DEFAULTS: GoalSet = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
}

export async function getProfileGoals(): Promise<GoalSet> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULTS

  const { data } = await supabase
    .from('profiles')
    .select('daily_kcal_target, daily_protein_g, daily_carbs_g, daily_fat_g')
    .eq('id', user.id)
    .single()

  if (!data) return DEFAULTS

  return {
    calories: data.daily_kcal_target,
    protein: data.daily_protein_g,
    carbs: data.daily_carbs_g,
    fat: data.daily_fat_g,
  }
}

export async function updateProfileGoals(
  update: ProfileUpdate,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...update }, { onConflict: 'id' })

  if (error) return { error: error.message }
  return { success: true }
}
