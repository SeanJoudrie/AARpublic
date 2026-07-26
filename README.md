# AAR — After-Action Resume

**Translate military experience into the job you're actually applying for.**

Paste a service record and a target job description. AAR rewrites every line into
recruiter-ready civilian language, scores your fit, flags the gaps, and drafts your STAR
interview answers — all tuned to that specific role.

See [`SPEC.md`](./SPEC.md) for the full technical spec and roadmap.

---

## Run it right now (zero setup — demo mode)

```bash
npm install
npm run dev
```

Open the local URL, click **Load example**, hit **Translate**. With no backend
configured the app runs in **demo mode** and returns a realistic sample result (streamed,
so you see bullets appear as they'd generate), so you can explore the entire UI
immediately.

You can also **upload** a PDF, DOCX, or TXT record instead of pasting, or **📸 scan a
photo** of a paper copy (the camera opens on phones) — everything is parsed/OCR'd in your
browser and never uploaded anywhere — and **export** the result as a copy-all block, an
editable `.docx`, or a `.pdf`.

> **Note on the `public/tesseract/` folder (~11 MB):** these are the self-hosted OCR
> engine + English model, so photo scanning works offline with no CDN. They're committed
> on purpose. If you don't need photo OCR, you can delete that folder and the `📸 Scan`
> button will simply error gracefully.

---

## Wire up the real backend (Claude via Supabase)

The Claude API key stays **server-side** in a Supabase Edge Function — it is never
shipped to the browser.

### 1. Create a Supabase project

Sign in at [supabase.com](https://supabase.com), create a project, and grab your
**project ref** (the `xxxx` in `xxxx.supabase.co`) and your **anon/publishable key**
(Project Settings → API).

### 2. Install the Supabase CLI and link

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

### 3. Set the Claude key as a secret and deploy the function

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy translate --no-verify-jwt
supabase functions deploy rephrase --no-verify-jwt
```

(The `rephrase` function powers the per-bullet "Rephrase" button and shares the
`_shared/security.ts` gate. The client finds it automatically next to `translate`, or set
`VITE_REPHRASE_URL` to override.)

`--no-verify-jwt` makes the function callable without a logged-in user. Drop it once you
add Supabase Auth.

### 4. Point the frontend at it

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_TRANSLATE_URL=https://<your-project-ref>.functions.supabase.co/translate
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Restart `npm run dev`. The "Demo mode" badge disappears and you're now hitting Claude
for real.

### 5. Rate limiting (recommended before going public)

Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor (or
`supabase db push`). It creates the `rate_limit` table and the `check_rate_limit`
function. The translate function calls it automatically using the service-role key that
Supabase injects into the edge runtime (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) — no
extra config needed. Default limit is **8 requests / IP / hour**; change it in
`supabase/functions/translate/security.ts`. If the table/function aren't present, the
limiter fails open (never blocks real users).

### 6. Human verification with Cloudflare Turnstile (recommended before going public)

Turnstile stops bots from finding and hammering your function. It's opt-in — skip it and
the app just runs without it.

1. Create a Turnstile widget at
   [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile. You get a **site key**
   (public) and a **secret key**.
2. Frontend — add the site key to `.env.local`:
   ```
   VITE_TURNSTILE_SITE_KEY=0x4AAA...
   ```
   A verification widget now appears above the Translate button and a solved token is
   required to submit.
3. Backend — set the secret and redeploy:
   ```bash
   supabase secrets set TURNSTILE_SECRET=0x4AAA...
   supabase functions deploy translate
   ```
   The function now rejects any request without a valid token. With no `TURNSTILE_SECRET`
   set, the check is skipped.

### 7. (Optional) Database for saved runs / semantic match

The same [`supabase/schema.sql`](./supabase/schema.sql) also defines the `runs` and
`requirement_embeddings` tables for the stretch goals — the core app is stateless and
needs neither.

### 8. Set the public URL before the production build (social previews)

Social scrapers (LinkedIn, Slack, iMessage) want an **absolute** `og:image` URL, so once
you know where the app lives, set it before building:

```
VITE_SITE_URL=https://your-domain.example
```

`vite.config.ts` rewrites the Open Graph tags to absolute URLs at build time. Left unset,
they stay page-relative — fine locally and for a GitHub Pages subpath, but some scrapers
won't resolve them.

The preview card itself is [`public/og.png`](./public/og.png) (1200×630). Its source is
[`design/og-card.html`](./design/og-card.html) — edit that and re-screenshot it at an
exact 1200×630 viewport (the file's header comment has the command).

---

## Stack

React 19 · Vite 6 · TypeScript · Tailwind v4 · Supabase Edge Functions (Deno) ·
Claude (`claude-opus-5`, streaming) · pdf.js + mammoth (upload) · Tesseract.js (on-device
photo OCR, self-hosted) · docx + jsPDF (export).

## Layout

```
src/
  App.tsx                  # two-column shell: inputs ↔ results
  lib/
    types.ts               # the JSON contract (source of truth)
    generate.ts            # streaming client; falls back to mock when no backend
    mock.ts                # canned demo result
    parseFile.ts           # PDF/DOCX/TXT -> text, in-browser (lazy-loaded)
    exportDoc.ts           # copy-all + DOCX/PDF export (lazy-loaded)
  components/               # MatchScore, KeywordChips, BulletCard, StarPrep, panels
                            # Legal.tsx = the #privacy / #terms pages
  data/samples.ts          # example résumé + JD
design/og-card.html        # source for the 1200×630 social card
supabase/
  functions/translate/     # Deno edge function → Claude (key server-side)
  functions/rephrase/      # single-bullet rephrase → Claude
  functions/_shared/       # security.ts (IP rate limit + Turnstile), shared
  schema.sql               # pgvector-ready schema for stretch goals
```

## Note on honesty

AAR never invents metrics the source doesn't support, and every bullet shows its
original + a rationale. Treat the output as a strong first draft to review — not a
final résumé.

The [privacy note](./src/components/Legal.tsx) (`#privacy`) and terms (`#terms`) describe
exactly what leaves the browser: files and photos are parsed on-device, only the text you
type is sent — to Anthropic's Claude API, via the edge function — nothing is written to a
database, and the only server-side record is a rate-limit counter keyed on IP that's
dropped after a day. **If that data flow ever changes, update those pages in the same
commit.**

## CI & deployment

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs `npm ci && npm run build`
(which type-checks first) on every push and PR, and uploads `dist/` as an artifact. There
are no automated tests yet — the build is the gate.

[`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) publishes on
every push to `main`. The live site is **https://seanjoudrie.github.io/AARpublic/**,
currently running in demo mode.

It deploys by force-pushing `dist/` to the `gh-pages` branch rather than using
`actions/deploy-pages`. That's deliberate: `actions/deploy-pages` needs the Pages site to
already exist, and `configure-pages` with `enablement: true` can't create it either —
it fails with *"Create Pages site: Resource not accessible by integration"*, because the
Actions token may deploy to Pages but not create the site. Pushing a `gh-pages` branch
enables Pages by itself. The `.nojekyll` file the workflow adds is **required**: without
it Jekyll strips the Vite chunks whose filenames start with an underscore
(`_commonjs-dynamic-modules-*.js`) and the app 404s at runtime.

To switch off demo mode, set `VITE_TRANSLATE_URL` and `VITE_SUPABASE_ANON_KEY` (and
optionally `VITE_TURNSTILE_SITE_KEY`) as repository **variables** under Settings → Secrets
and variables → Actions → Variables, then re-run the workflow. They're variables rather
than secrets because both keys are public by design and get compiled into the client
bundle. `ANTHROPIC_API_KEY` is never among them — it stays a Supabase secret.
