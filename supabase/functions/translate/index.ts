// AAR — translate edge function (Supabase / Deno).
//
// Takes { resume, jobDescription } and returns a TranslateResult (see
// ../../../src/lib/types.ts). The Claude API key lives ONLY here as a Supabase
// secret — it is never shipped to the browser.
//
// Deploy:  supabase functions deploy translate
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// The Anthropic SDK is imported via Deno's npm: specifier, which the Supabase
// Edge runtime resolves at deploy time.
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0'
import { clientIp, underRateLimit, verifyTurnstile } from '../_shared/security.ts'

const MODEL = 'claude-opus-5'

// CORS so the Vite dev server (localhost:5173) and your deployed site can call
// this. Tighten the origin in production if you want.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM = `You are AAR, an expert translator of U.S. military experience into civilian, recruiter-ready language, targeted to a specific job description.

Your job, given a service member's résumé/experience text and a target job description (JD):
1. Rewrite each meaningful line of military experience into a civilian bullet: strong action verb first, quantified where the source allows, and free of jargon, acronyms, and rank-speak. NEVER invent numbers or achievements that aren't supported by the source — if a metric isn't given, keep it qualitative.
2. Map the résumé to the JD: which JD keywords/skills the candidate already demonstrates (coveredKeywords) and which have no supporting evidence yet (missingKeywords).
3. Score overall fit 0-100 (matchScore), honestly. A weak match should score low.
4. Write a 2-3 sentence professional summary tailored to the JD.
5. Draft STAR-format answers (situation/task/action/result) for the 2-3 interview questions this JD is most likely to ask, grounded in the candidate's real experience.

Return ONLY a single JSON object. No prose, no markdown, no code fences. The object MUST match exactly this shape:
{
  "matchScore": number,               // 0-100
  "summary": string,
  "bullets": [
    { "original": string, "translated": string, "rationale": string, "keywords": string[] }
  ],
  "coveredKeywords": string[],
  "missingKeywords": string[],
  "starAnswers": [
    { "question": string, "situation": string, "task": string, "action": string, "result": string }
  ]
}`

interface TranslateRequest {
  resume: string
  jobDescription: string
  /** Cloudflare Turnstile token, when Turnstile is enabled on the client. */
  turnstileToken?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500)

  let payload: TranslateRequest
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const resume = (payload.resume ?? '').trim()
  const jobDescription = (payload.jobDescription ?? '').trim()
  if (!resume || !jobDescription) {
    return json({ error: 'Both resume and jobDescription are required.' }, 400)
  }

  // Basic input ceiling so a single request can't blow up token spend.
  if (resume.length > 20_000 || jobDescription.length > 20_000) {
    return json({ error: 'Input too long. Trim your résumé or job description.' }, 413)
  }

  // ── Abuse gates (no-op unless their env vars are configured) ──────────────
  const ip = clientIp(req)
  if (!(await verifyTurnstile(payload.turnstileToken, ip))) {
    return json({ error: 'Human verification failed. Refresh and try again.' }, 403)
  }
  if (!(await underRateLimit(ip))) {
    return json({ error: 'Rate limit reached. Try again later.' }, 429)
  }

  const client = new Anthropic({ apiKey })

  // Stream the model's text back to the browser as it generates. Streaming is
  // what keeps a long (opus + adaptive-thinking) request from hitting the
  // gateway timeout, and it lets the UI reveal bullets as they're written. The
  // streamed body is the raw JSON text; the client parses it once complete.
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          // Adaptive thinking improves the mapping/scoring reasoning.
          thinking: { type: 'adaptive' },
          system: SYSTEM,
          messages: [
            {
              role: 'user',
              content: `TARGET JOB DESCRIPTION:\n${jobDescription}\n\nMILITARY RÉSUMÉ / EXPERIENCE:\n${resume}\n\nReturn the JSON object now.`,
            },
          ],
        })
        // Fires only for output text deltas — thinking deltas are separate.
        stream.on('text', (delta: string) => controller.enqueue(encoder.encode(delta)))
        await stream.finalMessage()
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(body, {
    headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
