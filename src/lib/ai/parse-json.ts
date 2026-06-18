/**
 * Safely parse JSON from AI model responses.
 * Handles: raw JSON, markdown code fences, JSON embedded in text.
 */
export function parseAIJson<T = any>(text: string): T {
  // Strip markdown code fences
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract JSON object or array via regex
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]) as T;
    }
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]) as T;
    }
    throw new Error('No valid JSON found in AI response');
  }
}
