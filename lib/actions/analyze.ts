'use server'

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
  dataUrl: string
): Promise<{ data: FoodAnalysis } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'GEMINI_API_KEY is not set.' }

  const base64 = dataUrl.split(',')[1]
  if (!base64) return { error: 'Invalid image data.' }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        // Forces the model into JSON output mode — no prose, no fences.
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      PROMPT,
    ])

    const raw = result.response.text().trim()

    // Extract the first {...} block — handles any residual wrapping.
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object in response.')

    const parsed = JSON.parse(match[0]) as Record<string, unknown>

    for (const field of ['name', 'calories', 'protein', 'carbs', 'fat']) {
      if (!(field in parsed)) throw new Error(`Missing field: ${field}`)
    }

    return {
      data: {
        name: String(parsed.name),
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
