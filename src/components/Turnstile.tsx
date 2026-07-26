import { useEffect, useRef } from 'react'

// Cloudflare Turnstile widget. Renders only when VITE_TURNSTILE_SITE_KEY is set;
// otherwise it renders nothing and the app runs without human verification
// (fine for local dev / demo). The solved token is handed up via onToken.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
export const turnstileEnabled = !!SITE_KEY

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
    onTurnstileLoad?: () => void
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve()
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    window.onTurnstileLoad = () => resolve()
    if (existing) return
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    document.head.appendChild(s)
  })
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (token: string) => onToken(token),
      })
    })
    return () => {
      cancelled = true
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={ref} className="mt-1" />
}
