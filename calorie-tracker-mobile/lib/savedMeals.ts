import AsyncStorage from '@react-native-async-storage/async-storage'

export type SavedMeal = {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
}

const KEY = 'saved_meals_v1'

export async function getSavedMeals(): Promise<SavedMeal[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedMeal[]
  } catch {
    return []
  }
}

export async function saveMealTemplate(meal: Omit<SavedMeal, 'id'>): Promise<void> {
  const existing = await getSavedMeals()
  const newMeal: SavedMeal = {
    ...meal,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }
  await AsyncStorage.setItem(KEY, JSON.stringify([...existing, newMeal]))
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const existing = await getSavedMeals()
  await AsyncStorage.setItem(KEY, JSON.stringify(existing.filter((m) => m.id !== id)))
}
