'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export type FoodAnalysis = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

const PROMPT = `Analyze this food image and reply with ONLY a raw JSON object.
No markdown, no code fences, no explanation — just the JSON.
Required shape:
{"name":"string","calories":0,"protein":0,"carbs":0,"fat":0}
Rules:
- name: short descriptive food name
- calories: integer, estimated total kcal
- protein, carbs, fat: grams as numbers (one decimal is fine)`

export async function analyzeFood(
  dataUrl: string
): Promise<{ data: FoodAnalysis } | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'GEMINI_API_KEY is not set.' }

  const base64 = dataUrl.split(',')[1]
  if (!base64) return { error: 'Invalid image data.' }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      PROMPT,
    ])

    let text = result.response.text().trim()

    // Strip markdown code fences if the model wraps its response anyway.
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const parsed = JSON.parse(text) as Record<string, unknown>

    for (const field of ['name', 'calories', 'protein', 'carbs', 'fat']) {
      if (!(field in parsed)) throw new Error(`Missing field: ${field}`)
    }

    return {
      data: {
        name: String(parsed.name),
        calories: Number(parsed.calories),
        protein: Number(parsed.protein),
        carbs: Number(parsed.carbs),
        fat: Number(parsed.fat),
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Analysis failed.' }
  }
}
