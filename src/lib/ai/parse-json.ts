/**
 * Safely parse JSON from AI model responses.
 * Handles: raw JSON, markdown code fences, JSON embedded in text,
 * trailing commas, control characters, and malformed escapes.
 */
export function parseAIJson<T = any>(text: string): T {
  // Strip markdown code fences
  let cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  // Remove control characters that break JSON.parse
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) =>
    ch === '\n' || ch === '\r' || ch === '\t' ? ch : ''
  );

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // Extract JSON object via balanced brace matching
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0) {
        let jsonStr = cleaned.slice(start, i + 1);
        // Fix trailing commas before } or ]
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
        try {
          return JSON.parse(jsonStr) as T;
        } catch {
          // Try fixing common issues: single quotes → double quotes
          try {
            const fixed = jsonStr.replace(/'/g, '"');
            return JSON.parse(fixed) as T;
          } catch {}
        }
        break;
      }
    }
  }

  // Fallback: greedy regex
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      let jsonStr = objMatch[0].replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(jsonStr) as T;
    } catch {}
  }

  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]) as T;
    } catch {}
  }

  throw new Error('No valid JSON found in AI response');
}
