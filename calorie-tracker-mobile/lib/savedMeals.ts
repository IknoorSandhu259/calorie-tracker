import AsyncStorage from '@react-native-async-storage/async-storage'

export type SavedMeal = {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  useCount: number
  createdAt: number
}

type SavedMealV1 = Omit<SavedMeal, 'useCount' | 'createdAt'>
type SavedMealInput = Omit<SavedMeal, 'id' | 'useCount' | 'createdAt'>

const KEY_V1 = 'saved_meals_v1'
const KEY_V2 = 'saved_meals_v2'

function sortSavedMeals(meals: SavedMeal[]): SavedMeal[] {
  return [...meals].sort((a, b) => {
    if (b.useCount !== a.useCount) return b.useCount - a.useCount
    return b.createdAt - a.createdAt
  })
}

function normalizeMeal(meal: SavedMeal | SavedMealV1, index = 0): SavedMeal {
  const now = Date.now()
  return {
    id: meal.id,
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    useCount: 'useCount' in meal && Number.isFinite(meal.useCount) ? meal.useCount : 0,
    createdAt: 'createdAt' in meal && Number.isFinite(meal.createdAt) ? meal.createdAt : now - index,
  }
}

async function writeSavedMeals(meals: SavedMeal[]): Promise<void> {
  await AsyncStorage.setItem(KEY_V2, JSON.stringify(sortSavedMeals(meals)))
}

function sameTemplate(a: SavedMealInput, b: SavedMeal): boolean {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.calories === b.calories &&
    a.protein === b.protein &&
    a.carbs === b.carbs &&
    a.fat === b.fat
  )
}

export async function getSavedMeals(): Promise<SavedMeal[]> {
  try {
    const rawV2 = await AsyncStorage.getItem(KEY_V2)
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as SavedMeal[]
      return sortSavedMeals(parsed.map(normalizeMeal))
    }

    const rawV1 = await AsyncStorage.getItem(KEY_V1)
    if (!rawV1) return []

    const migrated = (JSON.parse(rawV1) as SavedMealV1[]).map(normalizeMeal)
    await writeSavedMeals(migrated)
    return sortSavedMeals(migrated)
  } catch {
    return []
  }
}

export async function saveMealTemplate(meal: SavedMealInput): Promise<void> {
  const existing = await getSavedMeals()
  if (existing.some((saved) => sameTemplate(meal, saved))) return

  const newMeal: SavedMeal = {
    ...meal,
    name: meal.name.trim(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    useCount: 0,
    createdAt: Date.now(),
  }
  await writeSavedMeals([...existing, newMeal])
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const existing = await getSavedMeals()
  await writeSavedMeals(existing.filter((m) => m.id !== id))
}

export async function updateSavedMeal(id: string, meal: SavedMealInput): Promise<void> {
  const existing = await getSavedMeals()
  await writeSavedMeals(existing.map((m) => (
    m.id === id ? { ...m, ...meal } : m
  )))
}

export async function incrementSavedMealUseCount(id: string): Promise<void> {
  const existing = await getSavedMeals()
  await writeSavedMeals(existing.map((m) => (
    m.id === id ? { ...m, useCount: m.useCount + 1 } : m
  )))
}
