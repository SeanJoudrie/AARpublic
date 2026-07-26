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

/**
 * A military job, as identified from whatever the user typed ("14B", "I was a
 * squad leader", "68 whiskey").
 *
 * `duties` are things people in this role COMMONLY did — never assertions
 * about this particular person. The UI asks them to tick what actually applies,
 * and any number in the final résumé comes from the user, never from us.
 */
export interface MosProfile {
  /** The code or description, normalized ("11B"). */
  code: string
  /** Plain-language job title ("Infantryman"). */
  title: string
  /** Service branch, when known. */
  branch: string
  /**
   * 'high' when we matched a code we're sure about; 'low' when it's inferred.
   * Low confidence makes the UI ask the user to confirm before going further.
   */
  confidence: 'high' | 'low'
  /** Duty statements to offer for selection. */
  duties: string[]
}

/** One duty the user confirmed they did, with any detail they chose to add. */
export interface ConfirmedDuty {
  duty: string
  /** Free text from the user — headcounts, dollar values, specifics. Optional. */
  detail: string
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
