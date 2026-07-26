// The JSON contract. This is the single source of truth for what the model
// returns, what the edge function validates, and what the UI renders. Keep the
// Deno edge function's JSON schema (supabase/functions/translate/index.ts) in
// lockstep with these types.

/** One translated experience line: military phrasing -> civilian STAR bullet. */
export interface Bullet {
  /** The original military phrasing the user supplied. */
  original: string
  /** Recruiter-ready civilian bullet, action-verb first, quantified. */
  translated: string
  /** One line on why this mapping is fair — keeps the translation honest. */
  rationale: string
  /** JD keywords this specific bullet demonstrates. */
  keywords: string[]
}

/** A STAR-format answer to a likely interview question for this role. */
export interface StarAnswer {
  question: string
  situation: string
  task: string
  action: string
  result: string
}

/** The full result of one translate run. */
export interface TranslateResult {
  /** 0-100 fit between the résumé and the JD. */
  matchScore: number
  /** 2-3 sentence professional summary, tailored to the JD. */
  summary: string
  /** Every translated bullet. */
  bullets: Bullet[]
  /** JD keywords the résumé already demonstrates. */
  coveredKeywords: string[]
  /** JD keywords with no evidence yet — the candidate's gap list. */
  missingKeywords: string[]
  /** STAR prep for the most likely interview questions. */
  starAnswers: StarAnswer[]
}

/** What the UI sends to the edge function. */
export interface TranslateRequest {
  /** Raw military résumé / experience text. */
  resume: string
  /** The target job description. */
  jobDescription: string
  /** Cloudflare Turnstile token, when human verification is enabled. */
  turnstileToken?: string
}
