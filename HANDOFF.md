# AAR — Session Handoff

This is a complete brief for a fresh Claude Code session (scoped to
`SeanJoudrie/AARpublic`) to pick up this project with zero prior context. Read it
top-to-bottom before touching code.

---

## 0. Your first task

The project files arrive as a zip (`aar-repo.zip`), which is already a git repo with
one commit on `main`.

1. Unzip it into this repo, preserving structure (`src/`, `supabase/`, `public/`, config
   files, `README.md`, `SPEC.md`, this `HANDOFF.md`).
2. `npm install && npm run build` — confirm a clean build (details in §6).
3. Commit everything to `main` and push. The remote may already have an auto-created
   `README.md`; a force-push is fine because that placeholder is the only thing there
   (`git push -u origin main --force`), or rebase and keep this project's README.
4. Reply with the build result. Do **not** deploy anything or add a PR unless asked.

---

## 1. What AAR is

**AAR (After-Action Resume)** turns military experience into a civilian, recruiter-ready
résumé **targeted to a specific job description**. It is a portfolio project by Sean
Joudrie (a U.S. Army National Guard officer candidate who started coding in 2025).

The differentiator vs. generic "military résumé translators": everything is computed
against the *specific job the user pastes in* —

- rewrites each experience line into a civilian STAR-style bullet (never inventing
  metrics),
- an honest 0–100 **match score**,
- **keyword gap analysis** (covered vs. missing),
- **STAR interview answers** for the questions that JD is likely to ask.

The name is a pun: an *After-Action Report/Review* is a real military document — the whole
visual identity leans into that ("Dossier" design system, §5).

**Tone rule:** the target user may be non-technical and on a phone. Copy is plain-language,
encouraging, jargon-free. Honesty is a feature — the app never fabricates numbers/awards
and says so.

---

## 2. Stack & architecture

React 19 · Vite 6 · TypeScript · Tailwind CSS v4 (`@tailwindcss/vite`, `@theme` tokens in
`src/index.css`) · Supabase Edge Functions (Deno) · **Claude `claude-opus-5`** (streaming,
adaptive thinking) · Tesseract.js (on-device OCR, self-hosted) · `docx` + `jsPDF` (export)
· `pdfjs-dist` + `mammoth` (file parsing).

```
Browser (React)
  │ POST { resume, jobDescription, turnstileToken? }
  ▼
Supabase Edge Function `translate` (Deno)   ← ANTHROPIC_API_KEY is a Supabase secret here
  │ streams Claude (claude-opus-5, adaptive thinking) → raw JSON text
  ▼
Client parses the streamed JSON → renders. Progressive bullet reveal during stream.

Second function `rephrase` returns 3 alternates for a single bullet.
Both share supabase/functions/_shared/security.ts (IP rate-limit + optional Turnstile).
```

**Mock mode:** if `VITE_TRANSLATE_URL` is unset, the whole app runs on canned data
(`src/lib/mock.ts`) with a simulated stream — fully explorable with zero backend. This is
how it runs by default after `npm run dev`.

**The Claude model is `claude-opus-5`. Do not downgrade it** without Sean asking. Adaptive
thinking (`thinking: { type: 'adaptive' }`); no `budget_tokens` on this model family.

---

## 3. File map

```
src/
  App.tsx                  3-step wizard controller; draft autosave (localStorage);
                           whitespace cleanup; passes onRetry / onRephrase / jobTitle
  main.tsx, index.css      entry + "Dossier" design system (§5)
  lib/
    types.ts               THE JSON CONTRACT (source of truth) — §4
    generate.ts            translate() (streaming) + rephrase(); mock fallbacks
    mock.ts                canned demo TranslateResult
    parseFile.ts           PDF (pdf.js) / DOCX (mammoth) / TXT → text, in-browser, lazy
    ocr.ts                 image → text via Tesseract.js, self-hosted assets, lazy
    exportDoc.ts           copy-all / DOCX / PDF (summary + bullets + STAR); title→filename
    glossary.ts            military-acronym dictionary + findAcronyms()
  components/
    Stepper, StepRecord, StepJob      the wizard (upload / camera-OCR / paste; JD paste)
    ResultPanel                       score + export + numbered sections + streaming state
    MatchScore, KeywordChips, BulletCard, StarPrep, NextSteps, Glossary
    Field                             textarea w/ counter, clear, paste, auto-grow
    Turnstile                         Cloudflare widget (renders only if site key set)
    TextSizeControl, ReadAloud, InfoTip, Icon (line-icon set)
supabase/
  functions/translate/index.ts       streaming Claude proxy
  functions/rephrase/index.ts        single-bullet rephrase
  functions/_shared/security.ts      clientIp, verifyTurnstile, underRateLimit
  schema.sql                         runs, requirement_embeddings (pgvector),
                                     rate_limit + check_rate_limit(), RLS
public/
  tesseract/                         SELF-HOSTED OCR assets (~11 MB) — see §7
  manifest.webmanifest, icon.svg     PWA
index.html                           meta/OG/favicon/manifest
README.md  SPEC.md                   user-facing docs + full technical spec/roadmap
```

---

## 4. The JSON contract (`src/lib/types.ts`)

The edge function's system prompt, the client, and the UI all speak exactly this. Keep
them in lockstep.

```ts
interface TranslateResult {
  matchScore: number            // 0-100
  summary: string               // 2-3 sentences, tailored to the JD
  bullets: { original: string; translated: string; rationale: string; keywords: string[] }[]
  coveredKeywords: string[]
  missingKeywords: string[]
  starAnswers: { question: string; situation: string; task: string; action: string; result: string }[]
}
interface TranslateRequest { resume: string; jobDescription: string; turnstileToken?: string }
```

---

## 5. Design system — "Dossier" (do not regress this)

A deliberate, non-"vibe-coded" language. Rules, all encoded in `src/index.css` primitives:

- **No emoji as icons, ever.** Use the line-icon set in `components/Icon.tsx` (single 1.5px
  stroke, `currentColor`). Add new icons there in the same style.
- **No pulsing "ping" dots.** Loading uses the determinate `.scanbar` sweep.
- **No "card soup."** Sections are numbered `01 / 02 / 03` (`.section-head`, `.section-num`)
  with hairline rules; bullets are hairline-separated rows, not boxed cards. Reserve boxed
  panels for genuinely distinct objects (score, STAR disclosures).
- **Palette (between-the-flags):** deep navy ground, one warm gold accent (`--color-accent`
  `#f2b134`) used only for primary emphasis, warm-paper ink, steel blue for secondary,
  green/`--color-low` for score bands. Tokens in the `@theme` block.
- **Keyword chips = form fields** (`.token`), not marketing pills.
- **Buttons:** `.btn` + `.btn-primary` / `.btn-ghost`. Crisp state changes, **no hover-lift
  translate**.
- Type: `Hanken Grotesk` (display) + `Inter` (body). `.label` = the sparing uppercase
  eyebrow — don't sprinkle it everywhere.
- All motion respects `prefers-reduced-motion` (already wired).

Accessibility already in place: focus-visible gold rings, skip link, aria-live "translation
ready" + focus to heading, tooltips dismiss on Esc, A/A+/A++ text-size control, read-aloud
(browser TTS). Keep new UI consistent with these.

---

## 6. Run / build / verify

```bash
npm install
npm run dev       # mock mode, zero setup — Load example → Translate
npm run build     # tsc -b && vite build ; MUST stay clean
```

**Visual/functional verification (how it's been tested):** `vite preview` (port 4173) +
Playwright headless screenshots. In THIS project's original environment Playwright was the
global install and Chromium was at a fixed path — **those paths are environment-specific;
in your session, use whatever Playwright/Chromium your environment provides** (or the repo's
own `@playwright/test` if you add it). The pattern that worked: run to a result in mock
mode, screenshot full flow, assert no `pageerror`. Note: `fullPage` screenshots + CSS
`backdrop-blur` produce a false "faded" artifact — verify with a normal viewport screenshot
and `getComputedStyle`, not fullPage, when checking opacity.

---

## 7. Self-hosted OCR (`public/tesseract/`, ~11 MB) — important

To make photo-scan OCR work **offline and with no CDN** (and so the user's image never
leaves the browser), the Tesseract engine + English model are committed to the repo:

- `worker.min.js`
- `tesseract-core-relaxedsimd-lstm.wasm.js`  ← what modern Chromium/mobile requests
- `tesseract-core-simd-lstm.wasm.js`         ← fallback for browsers without relaxed-SIMD
- `eng.traineddata.gz`

`src/lib/ocr.ts` points Tesseract at these via `import.meta.env.BASE_URL + 'tesseract/'`.
The `.wasm.js` files are single-file (embedded wasm) — no separate `.wasm` fetch. If you
ever move to `vite-plugin-pwa`, precache these with versioning; a naive service worker would
serve stale copies. (Offline SW was deliberately NOT added — see §9.)

---

## 8. Going live (when Sean asks — don't do it unprompted)

**Frontend hosting:**
- Netlify/Vercel/Cloudflare Pages (recommended): no config change needed (base `/`).
- **GitHub Pages under this repo** would serve at `seanjoudrie.github.io/AARpublic/` (a
  subpath) → you MUST set `base: './'` in `vite.config.ts`. The OCR + asset paths already
  use `import.meta.env.BASE_URL`, so they'll follow `base` correctly. (This exact subpath
  gotcha bit the portfolio project — remember it.)

**Backend (Supabase):**
```bash
supabase login && supabase link --project-ref <ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy translate --no-verify-jwt
supabase functions deploy rephrase --no-verify-jwt
# run supabase/schema.sql (rate_limit + check_rate_limit; runs/embeddings for stretch)
```
Then set client env in `.env.local`:
```
VITE_TRANSLATE_URL=https://<ref>.functions.supabase.co/translate
VITE_SUPABASE_ANON_KEY=<anon key>
# optional, recommended before public launch:
VITE_TURNSTILE_SITE_KEY=<cloudflare turnstile site key>   # + supabase secrets set TURNSTILE_SECRET=...
# VITE_REPHRASE_URL is auto-derived from VITE_TRANSLATE_URL; override only if needed
```
Security is opt-in and fails open: rate-limit runs if the DB function exists (uses the
auto-injected `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`); Turnstile runs only if
`TURNSTILE_SECRET` is set. With neither, dev/demo still works.

---

## 9. What's built vs. deferred

**Built:** streaming translate backend · rephrase backend · IP rate-limit + Turnstile +
input caps · file upload (PDF/DOCX/TXT) · camera→OCR (self-hosted) · DOCX/PDF/copy export
(with summary + STAR, title-based filename) · guided 3-step wizard · plain-language +
tooltips + narrated loading · read-aloud · text-size control · autosave draft · word
counter · filename chip · paste button · rotating placeholders · JD-mismatch hint ·
staggered fades · sticky mini-header + jump chips · inline bullet edit · per-bullet
rephrase · MOS/acronym glossary · aria-live/focus/retry/edge states · "Dossier" redesign ·
PWA manifest/favicon/OG.

**Deferred (candidate next work):**
- Accounts + saved history (the `runs` table + RLS already exist; wire Supabase Auth + a
  history sidebar). ← the biggest logical next feature.
- Semantic keyword match (pgvector `requirement_embeddings` table already scaffolded).
- Multi-JD compare.
- Service worker for true offline (skipped to avoid stale-cache pitfalls with the 11 MB
  OCR assets; do it properly with `vite-plugin-pwa` versioned precaching).
- Rank-aware tone (enlisted vs. officer leveling).

---

## 10. Gotchas

- Model is `claude-opus-5`; adaptive thinking; streaming; never downgrade silently.
- The edge function streams **raw JSON text**; the client tolerantly parses (strips code
  fences, extracts the outer `{...}`). Keep the system prompt's "return ONLY JSON" intact.
- `_shared/security.ts` is imported by both functions via `../_shared/security.ts` — keep
  the Supabase `_shared` convention so it bundles.
- Don't commit `node_modules` or `dist` (already in `.gitignore`).
- OPSEC: this is Sean's real identity/brand — keep military references general (roles,
  values), never unit/base/location specifics, in any copy.
