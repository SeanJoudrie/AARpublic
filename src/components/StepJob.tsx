import { Field } from './Field'
import { SAMPLE_JD } from '../data/samples'
import { Turnstile, turnstileEnabled } from './Turnstile'
import { InfoTip } from './InfoTip'
import { ArrowRightIcon, ArrowLeftIcon } from './Icon'

/** Step 2 — get the target job description, then translate. */
export function StepJob({
  jobDescription,
  hasToken,
  loading,
  onJobDescription,
  onToken,
  onSubmit,
  onBack,
}: {
  jobDescription: string
  hasToken: boolean
  loading: boolean
  onJobDescription: (v: string) => void
  onToken: (token: string) => void
  onSubmit: () => void
  onBack: () => void
}) {
  const ready = jobDescription.trim().length > 0 && (!turnstileEnabled || hasToken)

  return (
    <div className="fade-up space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          Now, the job you’re going for.
          <InfoTip label="A job description is the posting from the company — the list of what the role does and what they’re looking for. Copy it from LinkedIn, Indeed, or the company’s site and paste it here." />
        </h2>
        <p className="mt-2 text-mute">
          Find a job you want on LinkedIn, Indeed, or a company site. Copy the whole posting and paste
          it here — we’ll tune everything to that exact role.
        </p>
      </div>

      <div>
        <Field
          label="Paste the job posting"
          placeholder="Paste the full job description here…"
          value={jobDescription}
          rows={11}
          onChange={onJobDescription}
          tools
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ready && !loading) onSubmit()
          }}
        />
        <button
          onClick={() => onJobDescription(SAMPLE_JD)}
          className="mt-2 text-xs font-semibold text-steel underline decoration-navy-600 underline-offset-4 transition-colors hover:text-ink hover:decoration-accent"
        >
          Want to see what one looks like? Fill in an example
        </button>
      </div>

      {turnstileEnabled && (
        <div>
          <p className="mb-2 text-xs text-faint">Quick check to prove you’re human:</p>
          <Turnstile onToken={onToken} />
        </div>
      )}

      <div className="space-y-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-5 max-sm:border-t max-sm:border-navy-800 max-sm:bg-navy-950/95 max-sm:px-5 max-sm:py-3 max-sm:backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn btn-ghost px-5 py-3.5">
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={onSubmit}
            disabled={!ready || loading}
            className="btn btn-primary flex-1 px-6 py-3.5"
          >
            {loading ? 'Translating…' : 'Translate my experience'}
            {!loading && <ArrowRightIcon className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-center text-xs text-faint">
          Takes about 20 seconds · press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to run
        </p>
      </div>
    </div>
  )
}
