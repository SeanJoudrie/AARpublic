import { useEffect, useState } from 'react'
import { StepRecord } from './components/StepRecord'
import { StepJob } from './components/StepJob'
import { ResultPanel } from './components/ResultPanel'
import { Stepper } from './components/Stepper'
import { TextSizeControl } from './components/TextSizeControl'
import { Legal, type LegalSection } from './components/Legal'
import { translate, rephrase, isMockMode } from './lib/generate'
import { ArrowLeftIcon, RefreshIcon, LockIcon } from './components/Icon'
import type { TranslateResult } from './lib/types'

const STEPS = [
  { n: '01', label: 'Your service' },
  { n: '02', label: 'The job' },
  { n: '03', label: 'Your résumé' },
]

const JUMPS = [
  { id: 'sec-keywords', label: 'What this job wants' },
  { id: 'sec-bullets', label: 'Your experience' },
  { id: 'sec-star', label: 'Interview practice' },
]

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
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

      {/* Two-column composition. The page used to be one centred column at
          every width, which left ~300px of dead canvas each side on a desktop
          and read as a stretched phone. The rail carries the persistent
          context — where you are, and once there's a result, what it says. */}
      {!legal && (
      <div className="mx-auto grid max-w-6xl gap-x-14 px-5 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="no-print hidden pt-14 lg:block">
          <div className="sticky top-8 space-y-8">
            {step < 3 ? (
              <>
                <ol className="space-y-0">
                  {STEPS.map((s, i) => {
                    const n = i + 1
                    const done = n < step
                    const now = n === step
                    return (
                      <li key={s.n}>
                        <button
                          onClick={() => n < step && setStep(n)}
                          disabled={n >= step}
                          className={`flex w-full items-baseline gap-3 border-l-2 py-2.5 pl-4 text-left transition-colors ${
                            now
                              ? 'border-accent text-ink'
                              : done
                                ? 'border-navy-700 text-mute hover:border-steel hover:text-ink'
                                : 'border-navy-800 text-faint'
                          }`}
                        >
                          <span className="font-display text-xs font-extrabold">{s.n}</span>
                          <span className="text-sm font-semibold">{s.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
                <p className="flex items-start gap-2 border-t border-navy-800 pt-5 text-xs leading-relaxed text-faint">
                  <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Your file is read on your device and never uploaded.
                </p>
              </>
            ) : (
              <>
                {result && (
                  <div>
                    <p className="label mb-1">Match score</p>
                    <p className="font-display text-4xl font-extrabold text-head">
                      {result.matchScore}
                      <span className="ml-1 text-sm font-semibold text-faint">/ 100</span>
                    </p>
                  </div>
                )}
                {result && (
                  <nav className="space-y-0 border-t border-navy-800 pt-4">
                    {JUMPS.map((j) => (
                      <a
                        key={j.id}
                        href={`#${j.id}`}
                        className="block border-l-2 border-navy-800 py-2 pl-4 text-sm text-mute transition-colors hover:border-accent hover:text-ink"
                      >
                        {j.label}
                      </a>
                    ))}
                  </nav>
                )}
                <div className="flex flex-col items-start gap-2 border-t border-navy-800 pt-5">
                  <button onClick={() => setStep(2)} className="btn btn-ghost px-3 py-1.5 text-xs">
                    <ArrowLeftIcon className="h-3.5 w-3.5" />
                    Edit my answers
                  </button>
                  <button onClick={startOver} className="btn btn-ghost px-3 py-1.5 text-xs">
                    <RefreshIcon className="h-3.5 w-3.5" />
                    Start over
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          {step === 1 && (
            <section className="max-w-2xl pt-12 lg:max-w-3xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="label">Military</span>
                <span className="h-px w-8 bg-accent" />
                <span className="label text-accent">Civilian</span>
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[2.6rem]">
                Turn your service into a résumé that reads like the job you want.
              </h1>
              <p className="mt-4 max-w-xl text-mute">
                Three quick steps. No résumé-writing know-how needed — we handle the wording, the fit,
                and even your interview answers.
              </p>
            </section>
          )}

      <main id="main" tabIndex={-1} className="max-w-2xl py-10 outline-none lg:max-w-3xl lg:py-14">
        {/* The rail is the stepper on desktop; this is its small-screen twin. */}
        {step < 3 && (
          <div className="lg:hidden">
            <Stepper step={step} onJump={setStep} />
          </div>
        )}

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
          <div className="max-w-3xl">
            {/* Desktop keeps these in the rail; small screens need them inline. */}
            <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
              <button
                onClick={() => setStep(2)}
                className="btn btn-ghost px-3 py-1.5 text-sm"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Edit my answers
              </button>
              <button
                onClick={startOver}
                className="btn btn-ghost px-3 py-1.5 text-sm"
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
        </div>
      </div>
      )}

      <footer className="border-t border-navy-800/70">
        <div className="mx-auto max-w-6xl space-y-4 px-5 py-8 sm:px-8">
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
