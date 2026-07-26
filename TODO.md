# AAR — Everything Still Missing / To-Do

A single running list of what is NOT done yet: deferred features, things untested in
production, polish gaps, and the launch checklist. Ordered roughly by priority within each
section. (Everything in the app itself is built and works in demo mode — this is the
"what's left" list.)

---

## 1. Not yet verified against the REAL backend (highest risk)
Everything so far was built and tested in **mock mode** (canned data, simulated stream).
None of it has run against a live Supabase + Claude deployment. Before trusting it:

- [ ] Deploy `translate` + `rephrase` edge functions and set `ANTHROPIC_API_KEY`.
- [ ] Confirm the **real streaming** path parses correctly (the client tolerantly parses raw
      JSON — verify Claude actually returns clean JSON at `claude-opus-5` with adaptive
      thinking; tune the system prompt if it ever wraps output or adds prose).
- [ ] Confirm the **match score is honestly calibrated** on real résumés (a weak match must
      score low). Prompt-tune if it's inflating.
- [ ] Confirm the model **never invents numbers/awards** on real input (the core honesty
      promise). Test with sparse résumés.
- [ ] Confirm `rephrase` returns exactly 3 usable alternates on real bullets.
- [ ] Confirm the **rate-limit** function works live (run `schema.sql`, hit it repeatedly,
      verify the 429).
- [ ] Confirm **Turnstile** end-to-end (site key + `TURNSTILE_SECRET`) rejects a missing
      token and passes a real one.

## 2. Deferred features (product roadmap)
- [ ] **Accounts + saved history** — the `runs` table + RLS already exist; wire Supabase
      Auth + a history sidebar. Biggest logical next feature.
- [ ] **Semantic keyword match** — `requirement_embeddings` (pgvector) table is scaffolded;
      embed JD requirements + résumé lines so matches survive different wording.
- [ ] **Multi-JD compare** — paste several postings, see which fits best.
- [ ] **Rank-aware tone** — enlisted vs. officer vs. warrant → different civilian leveling.
- [ ] **Cover-letter generator** off the same inputs (natural adjacent feature).
- [ ] **Save/share a result link** (needs persistence).

## 3. Polish items explicitly skipped
- [ ] **Inline acronym tooltips** on the "Show original" text (glossary panel exists, but
      terms aren't yet dotted-underlined inline where they appear).
- [ ] **Jargon flag** — warn when a translated bullet still contains military jargon.
- [ ] **Bullet length cap** — soft warning on runaway paragraph-length bullets.
- [ ] **Gap-keyword → résumé evidence hover** (needs a data-model addition from the model).
- [ ] **Full color-contrast audit** (bumped `--color-faint`, but not formally WCAG-checked).
- [ ] **Full 44px tap-target audit** on every control (did the main ones).
- [ ] **True offline** — a `vite-plugin-pwa` service worker with versioned precaching for
      the 11 MB OCR assets. Deliberately skipped (naive SW = stale-cache bugs).

## 4. Real-device / cross-browser testing (only headless Chromium so far)
- [ ] **iOS Safari**: camera capture, HEIC photos (Tesseract likely can't decode HEIC —
      add a convert step or a friendly "take a JPEG / screenshot instead" message).
- [ ] **Android Chrome**: camera capture + OCR performance on a low-end phone.
- [ ] Verify **relaxed-SIMD vs SIMD** OCR fallback actually triggers on Safari.
- [ ] Pinch-zoom vs. the A/A+/A++ text-size control not fighting each other.
- [ ] Sticky mobile CTA on short viewports / with the keyboard open.
- [ ] Screen-reader pass (VoiceOver / NVDA) — aria-live + focus are wired but untested with
      a real reader.

## 5. Launch / hosting checklist
- [ ] Decide host: Netlify/Vercel/Cloudflare (base `/`, easiest) **vs** GitHub Pages under
      `AARpublic` (subpath → MUST set `base: './'` in `vite.config.ts`).
- [ ] Custom domain? (e.g. an `aar.*` domain, or a path on Sean's site.)
- [x] **CI** — `.github/workflows/ci.yml` runs `npm ci && npm run build` (type-check
      included) on every push/PR and uploads `dist/`. **Deploy** step still to add once the
      host is picked.
- [ ] `.env.local` production values wired (translate URL, anon key, Turnstile).
- [x] **OG/social image** — `public/og.png` (1200×630, Dossier style), source in
      `design/og-card.html`, `summary_large_image` tags wired. Set `VITE_SITE_URL` before the
      production build so the tags come out absolute (see README §8).
- [ ] Cost guardrail: monitor Anthropic spend; confirm rate limits + input caps are sane
      for a public launch.

## 6. Trust / legal / content
- [x] **Privacy statement** page — `src/components/Legal.tsx` at `#privacy`, linked from the
      footer; states plainly that the text goes to Anthropic's Claude API, that nothing is
      written to a database, and that the IP rate-limit counter is the one server-side record
      (dropped after a day). The footer disclosure now matches.
- [x] Light **Terms / disclaimer** — at `#terms`: draft-not-final, no guarantees, your
      content stays yours, fair use, and a "don't paste anything sensitive" section (no
      classified/CUI, no SSN/DoD ID, no units, locations, deployments, dates, or names).
- [ ] Verify the **"built by a veteran, for veterans"** framing is accurate/comfortable for
      Sean before using it as a marketing line. (Still open — the OG card and legal pages
      deliberately avoid any identity claim and say only "an independent project by Sean
      Joudrie, not a product of any government or military organization.")
- [ ] Decide whether to keep the app **AAR** branding vs. the repo name `AARpublic`.

## 7. Engineering hygiene
- [ ] **No automated tests** in the repo — add a few (unit for `glossary`/`generate`
      parsing, a Playwright e2e of the wizard).
- [ ] **No error monitoring** (Sentry or similar) for the live edge functions.
- [ ] Consider **code-splitting review** — heavy libs (pdf.js, jsPDF, docx, tesseract) are
      already lazy-loaded; re-check bundle after any new deps.
- [ ] `README` "run schema" step assumes the user runs `schema.sql` — could add a
      `supabase/migrations/` proper migration instead.

## 8. Content depth (nice-to-have quality)
- [ ] Expand the acronym **glossary dictionary** (currently ~40 terms; there are hundreds).
- [ ] Branch-specific term sets (Army vs. Navy vs. Air Force vocabulary).
- [ ] Better handling of **very long résumés** (multi-page ERB dumps) — chunking or
      summarizing before the translate call.
- [ ] Non-English or mixed-language input handling (currently English-only, incl. OCR model).

---

### The 3 things to do FIRST when you're ready to launch
1. **Deploy the real backend and run §1** — nothing is proven until the live Claude path works.
2. **Test camera-OCR on a real iPhone** (§4) — the biggest reach feature, most likely to
   surprise on device (HEIC).
3. **Pick a host + wire env + add an OG image** (§5) — so it's shareable the moment Sean
   posts it.
