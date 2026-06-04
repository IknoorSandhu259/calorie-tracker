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
