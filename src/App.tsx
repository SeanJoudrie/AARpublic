import { useEffect, useState } from 'react'
import { StepRecord } from './components/StepRecord'
import { StepJob } from './components/StepJob'
import { ResultPanel } from './components/ResultPanel'
import { Stepper } from './components/Stepper'
import { TextSizeControl } from './components/TextSizeControl'
import { Legal, type LegalSection } from './components/Legal'
import { translate, rephrase, isMockMode } from './lib/generate'
import { ArrowLeftIcon, RefreshIcon } from './components/Icon'
import type { TranslateResult } from './lib/types'

// Persist the in-progress draft so a refresh or accidental close doesn't wipe
// someone's work. Only the two text inputs — never the result.
const DRAFT_KEY = 'aar-draft'
function loadDraft(): { resume: string; jobDescription: string } {
  try {
    return { resume: '', jobDescription: '', ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') }
  } catch {
    return { resume: '', jobDescription: '' }
  }
}

/** Collapse the messy whitespace that PDF/OCR extraction leaves behind. */
function clean(text: string): string {
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
}

/** The legal pages are the app's only "other page" — a hash is enough routing,
 *  and it keeps them linkable (and shareable) without pulling in a router. */
function legalFromHash(): LegalSection | null {
  const hash = window.location.hash.replace('#', '')
  return hash === 'privacy' || hash === 'terms' ? hash : null
}

export function App() {
  const draft = loadDraft()
  const [step, setStep] = useState(1)
  const [resume, setResume] = useState(draft.resume)
  const [jobDescription, setJobDescription] = useState(draft.jobDescription)
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string[]>([])
  const [turnstileToken, setTurnstileToken] = useState('')
  const [legal, setLegal] = useState<LegalSection | null>(legalFromHash)

  // Follow #privacy / #terms, including the back button.
  useEffect(() => {
    const onHash = () => setLegal(legalFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Save the draft whenever the inputs change.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume, jobDescription }))
    } catch {
      /* storage may be full/blocked; not critical */
    }
  }, [resume, jobDescription])

  const onSubmit = async () => {
    setStep(3)
    setLoading(true)
    setError(null)
    setResult(null)
    setProgress([])
    try {
      const r = await translate(
        { resume: clean(resume), jobDescription: clean(jobDescription), turnstileToken: turnstileToken || undefined },
        { onProgress: setProgress },
      )
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const startOver = () => {
    setResult(null)
    setError(null)
    setProgress([])
    setStep(1)
  }

  return (
    <div className="min-h-screen">
      {/* Focus #main directly rather than letting the hash change — the hash is
          what selects the legal pages. */}
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="border-b border-navy-800/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded bg-accent font-display text-xs font-extrabold text-navy-950">
              AAR
            </span>
            <span className="hidden text-sm text-faint sm:inline">After-Action Resume</span>
          </div>
          <div className="flex items-center gap-4">
            <TextSizeControl />
            {isMockMode && (
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-faint sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Demo mode
              </span>
            )}
          </div>
        </div>
      </header>

      {legal && <Legal section={legal} onBack={() => { window.location.hash = '' }} />}

      {!legal && step === 1 && (
        <section className="mx-auto max-w-2xl px-5 pt-12 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="label">Military</span>
            <span className="h-px w-8 bg-accent" />
            <span className="label text-accent">Civilian</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[2.6rem]">
            Turn your service into a résumé that reads like the job you want.
          </h1>
          <p className="mt-4 max-w-xl text-mute">
            Three quick steps. No résumé-writing know-how needed — we handle the wording, the fit, and
            even your interview answers.
          </p>
        </section>
      )}

      {!legal && (
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-5 py-10 outline-none sm:px-8 lg:py-14">
        {step < 3 && <Stepper step={step} onJump={setStep} />}

        <div key={step} className="step-in">
        {step === 1 && (
          <StepRecord resume={resume} onResume={setResume} onNext={() => setStep(2)} />
        )}

        {step === 2 && (
          <StepJob
            jobDescription={jobDescription}
            hasToken={!!turnstileToken}
            loading={loading}
            onJobDescription={setJobDescription}
            onToken={setTurnstileToken}
            onSubmit={onSubmit}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute transition-colors hover:text-ink"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Edit my answers
              </button>
              <button
                onClick={startOver}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-steel transition-colors hover:text-ink"
              >
                <RefreshIcon className="h-4 w-4" />
                Start over
              </button>
            </div>
            <ResultPanel
              result={result}
              loading={loading}
              error={error}
              progress={progress}
              onRetry={onSubmit}
              onRephrase={(bullet, instruction) => rephrase(bullet, jobDescription, instruction)}
              jobTitle={jobDescription.split('\n').map((l) => l.trim()).find(Boolean) ?? ''}
            />
          </div>
        )}
        </div>
      </main>
      )}

      <footer className="border-t border-navy-800/70">
        <div className="mx-auto max-w-5xl space-y-4 px-5 py-8 sm:px-8">
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-semibold text-mute transition-colors marker:content-none hover:text-ink">
              Is my information safe?
            </summary>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-faint">
              Your file or photo is read <strong className="text-mute">on your device</strong> — it’s
              never uploaded. When you translate, the text you entered is sent to Anthropic’s Claude to
              write your résumé, and it isn’t stored anywhere afterwards. Your draft is saved in your
              own browser so a refresh won’t lose it; “Start over” clears it.{' '}
              <a href="#privacy" className="font-semibold text-steel hover:text-ink">
                Full privacy note
              </a>
              .
            </p>
          </details>
          <p className="text-sm text-faint">
            AAR · a project by Sean Joudrie · a strong first draft — always read it over before you send it.
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-faint">
            <a href="#privacy" className="font-semibold transition-colors hover:text-ink">
              Privacy
            </a>
            <span aria-hidden className="h-3 w-px bg-navy-700" />
            <a href="#terms" className="font-semibold transition-colors hover:text-ink">
              Terms &amp; disclaimer
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
