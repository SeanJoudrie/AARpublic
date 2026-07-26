// AAR — rephrase edge function (Supabase / Deno).
//
// Regenerates ONE résumé bullet: given the current civilian bullet and the
// target job description, returns 3 alternative phrasings. Same key-stays-
// server-side + rate-limit posture as translate.
//
// Deploy: supabase functions deploy rephrase
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0'
import { clientIp, underRateLimit, verifyTurnstile } from '../_shared/security.ts'

const MODEL = 'claude-opus-5'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `You rewrite a single civilian résumé bullet into 3 alternative phrasings, each tuned to the given job description. Keep every claim truthful to the input — never invent numbers or achievements. Vary the emphasis and the opening action verb across the three. Each must be one concise line.

Return ONLY a JSON object: { "alternatives": [string, string, string] }`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500)

  let payload: { bullet?: string; jobDescription?: string; turnstileToken?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const bullet = (payload.bullet ?? '').trim()
  const jobDescription = (payload.jobDescription ?? '').trim()
  if (!bullet) return json({ error: 'A bullet is required.' }, 400)
  if (bullet.length > 2000) return json({ error: 'Bullet too long.' }, 413)

  const ip = clientIp(req)
  if (!(await verifyTurnstile(payload.turnstileToken, ip))) return json({ error: 'Verification failed.' }, 403)
  // Rephrase is cheap but still gated; a higher ceiling than full translate.
  if (!(await underRateLimit(ip, { max: 40, windowSecs: 3600 }))) {
    return json({ error: 'Rate limit reached. Try again later.' }, 429)
  }

  const client = new Anthropic({ apiKey })
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `JOB DESCRIPTION:\n${jobDescription}\n\nCURRENT BULLET:\n${bullet}\n\nReturn the JSON now.`,
        },
      ],
    })
    const text = msg.content.find((b) => b.type === 'text')?.text ?? ''
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const parsed = JSON.parse(start !== -1 && end > start ? text.slice(start, end + 1) : text)
    return json({ alternatives: (parsed.alternatives ?? []).slice(0, 3) })
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 502)
  }
})
