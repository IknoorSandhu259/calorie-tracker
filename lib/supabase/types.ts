export type ProfileRow = {
  id: string
  daily_kcal_target: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
  onboarding_completed: boolean
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  height_cm: number | null
  weight_kg: number | null
  goal_type: 'lose' | 'maintain' | 'gain' | null
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active' | null
  goal_pace: 'slow' | 'moderate' | 'fast' | null
  updated_at: string
}

export type ProfileUpdate = {
  daily_kcal_target?: number
  daily_protein_g?: number
  daily_carbs_g?: number
  daily_fat_g?: number
  onboarding_completed?: boolean
  age?: number | null
  sex?: 'male' | 'female' | 'other' | null
  height_cm?: number | null
  weight_kg?: number | null
  goal_type?: 'lose' | 'maintain' | 'gain' | null
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active' | null
  goal_pace?: 'slow' | 'moderate' | 'fast' | null
}

export type MealRow = {
  id: string
  user_id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  date: string
  created_at: string
}

export type WeightLogRow = {
  id: string
  user_id: string
  date: string
  weight: number
  created_at: string
}

export type MealInsert = Omit<
  MealRow,
  'id' | 'created_at' | 'protein' | 'carbs' | 'fat'
> & {
  id?: string
  created_at?: string
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

export type WeightLogInsert = Omit<WeightLogRow, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Pick<ProfileRow, 'id'> & Partial<ProfileUpdate>
        Update: ProfileUpdate
        Relationships: []
      }
      meals: {
        Row: MealRow
        Insert: MealInsert
        Update: Partial<MealInsert>
        Relationships: []
      }
      weight_logs: {
        Row: WeightLogRow
        Insert: WeightLogInsert
        Update: Partial<WeightLogInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type HomeMeal = Pick<
  MealRow,
  'id' | 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'created_at'
>

export type MealSummary = Pick<MealRow, 'id' | 'name' | 'calories'>
