// Abuse protection for the translate function: client-IP resolution, Cloudflare
// Turnstile verification, and a Postgres-backed IP rate limiter.
//
// Both checks are OPT-IN by environment:
//   - Turnstile runs only if TURNSTILE_SECRET is set.
//   - Rate limiting runs only if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
//     present (they're auto-injected in the Supabase Edge runtime).
// This keeps local dev and the zero-setup demo working while making the
// deployed, public function safe from bill-draining abuse.

/** Best-effort client IP from the proxy headers Supabase sets. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Verify a Cloudflare Turnstile token. Returns true when Turnstile isn't
 * configured (nothing to enforce) or the token is valid; false only when
 * Turnstile is on and the token is missing/invalid.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET')
  if (!secret) return true // not configured -> skip
  if (!token) return false

  const form = new URLSearchParams({ secret, response: token, remoteip: ip })
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

/**
 * Fixed-window IP rate limit via the check_rate_limit SQL function.
 * Returns true (allowed) when rate limiting isn't configured or the caller is
 * under the limit; false when over.
 */
export async function underRateLimit(
  ip: string,
  { max = 8, windowSecs = 3600 }: { max?: number; windowSecs?: number } = {},
): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return true // not configured -> skip

  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_ip: ip, p_max: max, p_window_secs: windowSecs }),
    })
    if (!res.ok) return true // fail open on infra error — don't block real users
    return (await res.json()) === true
  } catch {
    return true // fail open
  }
}
