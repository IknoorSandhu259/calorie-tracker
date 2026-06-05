// Shared types and the Mifflin-St Jeor calculation used across onboarding and profile.

export type Sex = 'male' | 'female' | 'other'
export type GoalType = 'lose' | 'maintain' | 'gain'
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active'
export type GoalPace = 'slow' | 'moderate' | 'fast'

export type GoalSet = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const DEFAULT_GOALS: GoalSet = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
}

// kcal surplus/deficit per day for each pace
const PACE_DELTA: Record<GoalPace, number> = {
  slow: 250,     // ~0.25 kg/wk
  moderate: 500, // ~0.5  kg/wk
  fast: 750,     // ~0.75 kg/wk
}

export function calculateGoals(params: {
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  goal_type: GoalType
  activity_level: ActivityLevel
  goal_pace: GoalPace
}): GoalSet {
  const { age, sex, height_cm, weight_kg, goal_type, activity_level, goal_pace } = params

  // Mifflin-St Jeor BMR
  let bmr: number
  if (sex === 'male') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  } else if (sex === 'female') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 78 // midpoint of M/F offsets
  }

  const tdee = bmr * ACTIVITY_MULTIPLIER[activity_level]
  const delta = goal_type === 'maintain' ? 0 : PACE_DELTA[goal_pace]
  const rawCal =
    goal_type === 'lose' ? tdee - delta
    : goal_type === 'gain' ? tdee + delta
    : tdee

  const calories = Math.max(1200, Math.round(rawCal))

  // Protein: higher for cutting, moderate for building, lower for maintenance
  const proteinPerKg = goal_type === 'lose' ? 2.0 : goal_type === 'gain' ? 2.2 : 1.8
  const protein = Math.round(weight_kg * proteinPerKg)

  // Fat: 28% of total calories
  const fat = Math.round((calories * 0.28) / 9)

  // Carbs: fill remaining kcal budget
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))

  return { calories, protein, carbs, fat }
}
