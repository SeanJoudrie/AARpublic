import type { MosProfile, TranslateRequest, TranslateResult } from './types'
import { MOCK_RESULT } from './mock'
import { fallbackDuties, lookupMos, normalizeCode } from './mos'

// The Supabase Edge Function URL. Set VITE_TRANSLATE_URL in .env.local to point
// at your deployed function, e.g.
//   https://<project-ref>.functions.supabase.co/translate
// When it's unset, the app runs in mock mode so you can explore the whole UI
// with zero backend setup.
const TRANSLATE_URL = import.meta.env.VITE_TRANSLATE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
// The rephrase function sits next to translate; derive its URL by swapping the
// path segment, or set VITE_REPHRASE_URL explicitly.
const REPHRASE_URL =
  (import.meta.env.VITE_REPHRASE_URL as string | undefined) ??
  (TRANSLATE_URL ? TRANSLATE_URL.replace(/\/translate\b/, '/rephrase') : undefined)
// Same trick for the role-lookup function used by the guided intake.
const SUGGEST_URL =
  (import.meta.env.VITE_SUGGEST_URL as string | undefined) ??
  (TRANSLATE_URL ? TRANSLATE_URL.replace(/\/translate\b/, '/suggest') : undefined)

export const isMockMode = !TRANSLATE_URL

/**
 * Pull completed `translated` bullet strings out of a partial JSON buffer.
 * A value is complete once its closing quote arrives, so this is safe to run on
 * every chunk — it just reveals more bullets as the stream fills in.
 */
function extractBullets(buffer: string): string[] {
  const out: string[] = []
  const re = /"translated"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(buffer))) {
    try {
      out.push(JSON.parse(`"${m[1]}"`))
    } catch {
      /* skip a still-escaping fragment */
    }
  }
  return out
}

/** Tolerant parse: strips accidental code fences and extracts the JSON object. */
function parseResult(text: string): TranslateResult {
  const cleaned = text.replace(/^```(?:json)?/gm, '').replace(/```$/gm, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const slice = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned
  return JSON.parse(slice) as TranslateResult
}

export interface TranslateOptions {
  /** Called as bullets complete during streaming, for progressive reveal. */
  onProgress?: (bullets: string[]) => void
}

/**
 * Translate a military résumé against a job description, streaming the result.
 * Falls back to a simulated stream over canned data when no backend is set.
 */
export async function translate(
  req: TranslateRequest,
  { onProgress }: TranslateOptions = {},
): Promise<TranslateResult> {
  if (!TRANSLATE_URL) return mockStream(onProgress)

  const res = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
    },
    body: JSON.stringify(req),
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Translate failed (${res.status}): ${detail || res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    onProgress?.(extractBullets(buffer))
  }
  return parseResult(buffer)
}

/**
 * Get 3 alternative phrasings for a single bullet. `instruction` carries the
 * user's own steer — "shorter", "say more about the leadership part" — so
 * rephrasing is a conversation rather than a dice roll. Uses a light
 * client-side rewrite in mock mode so the feature is explorable with no backend.
 */
export async function rephrase(
  bullet: string,
  jobDescription: string,
  instruction?: string,
): Promise<string[]> {
  if (!REPHRASE_URL) {
    await new Promise((r) => setTimeout(r, 700))
    return mockRephrase(bullet, instruction)
  }
  const res = await fetch(REPHRASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
    },
    body: JSON.stringify({ bullet, jobDescription, instruction }),
  })
  if (!res.ok) throw new Error(`Rephrase failed (${res.status})`)
  const data = (await res.json()) as { alternatives?: string[] }
  return data.alternatives ?? []
}

/** Deterministic client-side variants for demo mode. */
function mockRephrase(bullet: string, instruction?: string): string[] {
  const body = bullet.replace(/^[A-Z][a-z]+ /, '').replace(/\.$/, '')
  const lower = body.charAt(0).toLowerCase() + body.slice(1)
  // Demo mode can't actually reason about the instruction, but it should show
  // that the instruction was received rather than silently ignoring it.
  if (instruction?.trim()) {
    const note = instruction.trim().replace(/\.$/, '')
    return [
      `Directed ${lower} — ${note}.`,
      `Owned ${lower}, with ${note}.`,
      `Delivered ${lower} (${note}).`,
    ]
  }
  return [
    `Directed ${lower}.`,
    `Owned and executed ${lower}.`,
    `Recognized for ${lower}.`,
  ]
}

/**
 * Identify a military job from whatever the user typed and offer duties they
 * can confirm. Local seed first (instant, works offline, and only contains
 * codes we're sure of); the model fills the long tail.
 *
 * Whatever comes back is a *proposal* — the UI makes the user confirm the role
 * and tick individual duties, so nothing enters their résumé unaffirmed.
 */
export async function suggestRole(query: string): Promise<MosProfile> {
  const local = lookupMos(query)
  if (local?.confidence === 'high') return local

  if (SUGGEST_URL) {
    try {
      const res = await fetch(SUGGEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
        },
        body: JSON.stringify({ query }),
      })
      if (res.ok) {
        const data = (await res.json()) as Partial<MosProfile>
        if (data.title && Array.isArray(data.duties) && data.duties.length) {
          return {
            code: data.code || normalizeCode(query),
            title: data.title,
            branch: data.branch ?? '',
            // The model is never treated as certain — the UI always asks.
            confidence: data.confidence === 'high' ? 'high' : 'low',
            duties: data.duties,
          }
        }
      }
    } catch {
      /* fall through to whatever we can offer locally */
    }
  }

  if (local) return local
  return {
    code: query.trim(),
    title: '',
    branch: '',
    confidence: 'low',
    duties: fallbackDuties(),
  }
}

/** Turn confirmed duties into the experience text the translator consumes. */
export function composeExperience(
  role: { title: string; code: string; branch: string },
  duties: { duty: string; detail: string }[],
): string {
  const heading = [role.title || role.code, role.branch && `(${role.branch})`]
    .filter(Boolean)
    .join(' ')
  const lines = duties.map(({ duty, detail }) =>
    detail.trim() ? `- ${duty} — ${detail.trim()}` : `- ${duty}`,
  )
  return [heading && `Role: ${heading}`, '', ...lines].filter((l) => l !== undefined).join('\n').trim()
}

/** Simulate a stream so mock mode exercises the same progressive-reveal path. */
async function mockStream(onProgress?: (bullets: string[]) => void): Promise<TranslateResult> {
  const full = JSON.stringify(MOCK_RESULT)
  const steps = 24
  const size = Math.ceil(full.length / steps)
  let buffer = ''
  for (let i = 0; i < full.length; i += size) {
    buffer += full.slice(i, i + size)
    onProgress?.(extractBullets(buffer))
    await new Promise((r) => setTimeout(r, 55))
  }
  return MOCK_RESULT
}
