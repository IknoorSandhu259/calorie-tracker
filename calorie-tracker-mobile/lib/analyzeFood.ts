// NOTE: EXPO_PUBLIC_GEMINI_API_KEY is bundled into the client binary.
// For production, proxy this call through a server endpoint (e.g. Supabase Edge Function).
import { GoogleGenerativeAI } from '@google/generative-ai'

export type FoodAnalysis = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

const PROMPT =
  'You are a nutrition analyst. Analyze the food in this image. ' +
  'Return a single JSON object with exactly these keys: ' +
  'name (string), calories (integer kcal), protein (number g), carbs (number g), fat (number g). ' +
  'No extra keys, no explanation, no markdown.'

export async function analyzeFood(
  base64: string,
): Promise<{ data: FoodAnalysis } | { error: string }> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY
  if (!apiKey) return { error: 'Gemini API key not configured.' }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      PROMPT,
    ])

    const raw = result.response.text().trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object in response.')

    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    for (const field of ['name', 'calories', 'protein', 'carbs', 'fat']) {
      if (!(field in parsed)) throw new Error(`Missing field: ${field}`)
    }

    const name = String(parsed.name)
    if (/no food|not food|cannot|unable|no dish|no meal|n\/a/i.test(name)) {
      return { error: 'No food detected. Try a clearer photo.' }
    }

    return {
      data: {
        name,
        calories: Math.round(Number(parsed.calories)),
        protein: Number(parsed.protein),
        carbs: Number(parsed.carbs),
        fat: Number(parsed.fat),
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Analysis failed.' }
  }
}
