// AAR — suggest edge function (Supabase / Deno).
//
// Powers the guided intake: given whatever the user typed about their military
// job ("14B", "68 whiskey", "I ran supply for my company"), identify the role
// and offer duty statements they can confirm.
//
// The honesty posture matters more here than anywhere else in the app. This
// function PROPOSES; the user disposes. It is told to report low confidence
// rather than guess a job title, because telling a veteran they did a job they
// didn't do is the fastest way to lose their trust — and the client always
// makes them confirm before any of it reaches their résumé.
//
// Deploy: supabase functions deploy suggest --no-verify-jwt
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0'
import { clientIp, underRateLimit, verifyTurnstile } from '../_shared/security.ts'

const MODEL = 'claude-opus-5'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `You identify a U.S. military job from whatever a service member types — an MOS/rate/AFSC code ("11B", "68 whiskey", "3P0X1"), or a plain description ("I ran supply for my company").

Return:
1. The job code as normally written, the plain-English title, and the branch.
2. 6-8 duty statements describing what someone in this job COMMONLY did, written in plain civilian language, second person, no jargon or acronyms.

Hard rules:
- If you are not confident which job a code refers to, set confidence to "low" and leave title as an empty string. NEVER guess a title. A wrong identification is far worse than an unknown one — the person reading this served in that job and will know instantly.
- Duty statements describe the ROLE in general, never this individual. They will be shown as checkboxes for the person to confirm.
- Never include a number, headcount, dollar value, award, or deployment in a duty statement. Those come only from the user.
- No unit names, base names, or locations.
- Each duty is one line, starting with a verb in the past tense or "Was/Were".

Return ONLY a JSON object:
{ "code": string, "title": string, "branch": string, "confidence": "high" | "low", "duties": [string] }`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500)

  let payload: { query?: string; turnstileToken?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const query = (payload.query ?? '').trim()
  if (!query) return json({ error: 'A query is required.' }, 400)
  if (query.length > 400) return json({ error: 'Query too long.' }, 413)

  const ip = clientIp(req)
  if (!(await verifyTurnstile(payload.turnstileToken, ip))) return json({ error: 'Verification failed.' }, 403)
  // Cheap lookup, and it's the first thing a new user touches — a higher
  // ceiling than translate so exploring never hits a wall.
  if (!(await underRateLimit(ip, { max: 60, windowSecs: 3600 }))) {
    return json({ error: 'Rate limit reached. Try again later.' }, 429)
  }

  const client = new Anthropic({ apiKey })
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: `THEY TYPED:\n${query}\n\nReturn the JSON now.` }],
    })
    const text = msg.content.find((b) => b.type === 'text')?.text ?? ''
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const parsed = JSON.parse(start !== -1 && end > start ? text.slice(start, end + 1) : text)
    return json({
      code: String(parsed.code ?? query),
      title: String(parsed.title ?? ''),
      branch: String(parsed.branch ?? ''),
      confidence: parsed.confidence === 'high' ? 'high' : 'low',
      duties: (parsed.duties ?? []).slice(0, 8).map(String),
    })
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 502)
  }
})
