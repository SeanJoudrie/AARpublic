# AAR — After-Action Resume · Technical Spec

## The one-liner

Paste a military résumé + a target job description → get civilian, recruiter-ready
bullets, an honest fit score, a covered-vs-missing keyword gap analysis, and STAR
interview answers — all tuned to that specific role.

## Why it's different

Most "military résumé translators" are generic: they turn MOS codes into civilian
titles and stop there. AAR is **JD-targeted**. Every output is computed against the
*specific job you're applying to*:

- **Match score** — honest 0-100 fit, not a vanity number.
- **Gap analysis** — the JD keywords you already prove vs. the ones you don't, so you
  know exactly what to add or address.
- **STAR prep** — interview answers grounded in your real experience, for the questions
  *this* JD is most likely to ask.

That target-to-a-JD loop is the moat. It's the difference between "here's your résumé
in civilian words" and "here's how you win this specific job."

## Architecture

```
Browser (React + Vite + TS + Tailwind)
   │  POST { resume, jobDescription }
   ▼
Supabase Edge Function  (Deno)   ← ANTHROPIC_API_KEY lives here as a secret
   │  Anthropic SDK → claude-opus-5 (adaptive thinking)
   ▼
Claude returns strict JSON → validated → returned to the browser
```

- The API key **never** touches the client. The browser only ever talks to the edge
  function.
- Translation is **stateless** by default — no DB needed to run. The SQL schema
  (`supabase/schema.sql`) is only for the "save my runs" + semantic-match stretch goals.
- The frontend runs in **mock mode** with zero backend, so the UI is fully explorable
  before any key or Supabase project exists.

## The JSON contract

`src/lib/types.ts` is the single source of truth. The edge function's system prompt and
the UI both speak exactly this shape:

```ts
interface TranslateResult {
  matchScore: number            // 0-100
  summary: string               // 2-3 sentences, tailored to the JD
  bullets: {
    original: string            // military phrasing (input line)
    translated: string          // civilian STAR-style bullet
    rationale: string           // why the mapping is fair
    keywords: string[]          // JD keywords this bullet hits
  }[]
  coveredKeywords: string[]     // JD keywords with evidence
  missingKeywords: string[]     // JD keywords without evidence → the gap list
  starAnswers: {
    question: string
    situation: string; task: string; action: string; result: string
  }[]
}
```

## The honesty guardrail

The system prompt forbids inventing metrics or achievements not supported by the source.
If the input has no number, the output stays qualitative. Every bullet carries a
`rationale` so the mapping is auditable. The footer reminds users this is a starting
point to review, not a final résumé. This matters: a translator that fabricates gets
people caught in interviews.

## Shipped (Tier 1)

- ✅ **Résumé file upload** — drop/browse a PDF, DOCX, or TXT; parsed in-browser via
  pdf.js / mammoth, never uploaded (`src/lib/parseFile.ts`).
- ✅ **Export** — copy-all, plus real DOCX (via `docx`) and PDF (via `jsPDF`) downloads
  (`src/lib/exportDoc.ts`).
- ✅ **Streaming** — the edge function streams Claude's output; the UI reveals bullets as
  they're written, and streaming avoids the gateway timeout on long requests.
- ✅ **Abuse protection** — fixed-window IP rate limiting (Postgres `check_rate_limit`) and
  optional Cloudflare Turnstile human verification, plus an input-length ceiling. Both
  gates are opt-in by env var and fail open, so dev/demo stay zero-setup
  (`supabase/functions/translate/security.ts`).
- ✅ **Ease-of-use pass** (built for a non-technical service member, likely on a phone):
  - **Guided 3-step wizard** with a "Step 1 of 3" progress bar — upload/paste → paste JD →
    result — instead of a wall of empty boxes (`Stepper`, `StepRecord`, `StepJob`).
  - **Plain-language everywhere** — every section header reworded, "?" tooltips define
    match score / keywords / STAR (`InfoTip`), and the loading state narrates in plain
    words ("Reading your experience… matching it to the job…").
  - **Read-aloud** on the summary and each interview answer via browser text-to-speech —
    free, doubles as rehearsal (`ReadAloud`).
  - **Text-size control** (A / A+ / A++) that scales the whole UI and remembers the choice.
  - **"Here's what to do next" checklist** + a trust badge ("stays on your device").
  - **📸 Scan a photo → OCR** — photograph a paper ERB/NCOER (camera opens directly on
    phones) and the text is read on-device with Tesseract.js. All OCR assets (engine +
    English model) are **self-hosted** from `/public/tesseract` — no CDN, works offline,
    and the image never leaves the browser (`src/lib/ocr.ts`, `StepRecord`).
- ✅ **"Dossier" design system** — a deliberate visual language so the app doesn't read as
  AI-generated. A single line-icon set at one stroke weight (`Icon.tsx`) replaces every
  emoji/glyph; numbered `01/02/03` sections with hairline rules replace boxed "card soup";
  keyword tokens read as form fields, not marketing pills; buttons use crisp state changes
  (no hover-lift); and a calm determinate "scanbar" sweep replaces pulsing loading dots.
  Reusable primitives (`.label`, `.section-head`, `.btn`, `.token`, `.scanbar`) live in
  `index.css`.
- ✅ **MOS / acronym glossary** — a client-side dictionary (`src/lib/glossary.ts`) detects
  military acronyms in the user's own record (NCO, BN, SOP, ERB, SHARP, …) and renders a
  "Military terms we spotted" panel with plain-English definitions — the domain-specific
  touch a generic wrapper won't make.
- ✅ **Per-bullet rephrase** — a dedicated `rephrase` edge function returns 3 alternative
  phrasings for a single bullet (key server-side, its own rate-limit ceiling); the UI lets
  you pick one. Mock mode returns client-side variants so it's explorable with no backend.
  Security lives in `supabase/functions/_shared/security.ts`, shared by both functions.
- ✅ **Input safeguards & mobile** — a gentle "this looks like a job posting" hint if the
  résumé box gets JD-like text, whole-step drag-and-drop, and a bottom-sticky primary CTA
  on phones so the action is always thumb-reachable.

_Intentionally deferred:_ a service worker for true offline use (skipped to avoid
stale-cache pitfalls with the 11 MB self-hosted OCR assets — the manifest still makes the
app installable).

## Roadmap (what to expand from here)

1. **Auth + saved runs** — the `runs` table already exists; wire Supabase Auth and a
   history sidebar.
3. **Semantic keyword match** — embed JD requirements + résumé lines (pgvector table is
   scaffolded) so a requirement matches even when the wording differs.
4. **Multiple JD compare** — paste 3 postings, see which one you fit best.
5. **MOS + acronym auto-expansion** — detect and expand MOS codes / military acronyms with
   a glossary panel.
6. **Rank-aware tone** — enlisted vs. officer vs. warrant produces different civilian
   leveling.
```
