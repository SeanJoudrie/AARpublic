import { useEffect, useRef, useState } from 'react'
import type { ConfirmedDuty, MosProfile } from '../lib/types'
import { composeExperience, suggestRole } from '../lib/generate'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from './Icon'

const EXAMPLES = ['11B', '68W', '92Y', 'I was a squad leader']

type Stage = 'ask' | 'confirm' | 'pick'

/**
 * "Build it with me" — the path for someone who has no résumé and wouldn't
 * know where to start.
 *
 * Ask what their job was → tell them what that job usually involves → let them
 * tick what they actually did → hand the result to the translator.
 *
 * The honesty rule runs through the whole flow: we propose, they affirm. The
 * role identification is always confirmed by the user (we can be wrong about a
 * code), duties are opt-in one by one, and every number is typed by them.
 */
export function GuidedIntake({
  onDone,
  onCancel,
}: {
  onDone: (experience: string) => void
  onCancel: () => void
}) {
  const [stage, setStage] = useState<Stage>('ask')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [role, setRole] = useState<MosProfile | null>(null)
  const [ownTitle, setOwnTitle] = useState('')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [extra, setExtra] = useState('')
  const [extras, setExtras] = useState<string[]>([])
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Each stage is a new question — move focus so it's announced and reachable.
  useEffect(() => {
    headingRef.current?.focus()
  }, [stage])

  const look = async (q: string) => {
    if (!q.trim()) return
    setBusy(true)
    try {
      setRole(await suggestRole(q))
      setStage('confirm')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (duty: string) => {
    setPicked((prev) => {
      if (duty in prev) {
        const { [duty]: _drop, ...rest } = prev
        return rest
      }
      return { ...prev, [duty]: '' }
    })
  }

  const addExtra = () => {
    const v = extra.trim()
    if (!v) return
    setExtras((xs) => [...xs, v])
    setPicked((prev) => ({ ...prev, [v]: '' }))
    setExtra('')
  }

  const finish = () => {
    const duties: ConfirmedDuty[] = Object.entries(picked).map(([duty, detail]) => ({ duty, detail }))
    onDone(
      composeExperience(
        { title: ownTitle || role?.title || '', code: role?.code ?? query, branch: role?.branch ?? '' },
        duties,
      ),
    )
  }

  const allDuties = [...(role?.duties ?? []), ...extras]
  const chosen = Object.keys(picked).length

  return (
    <div className="step-in">
      <div className="section-head mb-5">
        <span className="section-num">→</span>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-lg font-bold text-ink outline-none"
        >
          {stage === 'ask' && 'Let’s build it together'}
          {stage === 'confirm' && 'Did we get your job right?'}
          {stage === 'pick' && 'Which of these did you actually do?'}
        </h3>
      </div>

      {/* ── 1. What was your job? ─────────────────────────────────────────── */}
      {stage === 'ask' && (
        <div className="space-y-4">
          <p className="text-mute">
            You don’t need a résumé to start. Tell us your job code or just describe what you
            did — we’ll work out the rest with you.
          </p>
          <label htmlFor="mos" className="label block">
            Your job in the service
          </label>
          <input
            id="mos"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') look(query)
            }}
            placeholder="e.g. 11B, 68 whiskey, or “I ran supply for my company”"
            className="w-full rounded-lg border border-navy-700 bg-navy-900/60 px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-faint">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex)
                  look(ex)
                }}
                className="token border-navy-700 bg-navy-850 text-steel transition-colors hover:border-accent hover:text-accent"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => look(query)}
              disabled={!query.trim() || busy}
              className="btn btn-primary px-5 py-2.5"
            >
              {busy ? 'Looking it up…' : 'Continue'}
              {!busy && <ArrowRightIcon className="h-4 w-4" />}
            </button>
            <button onClick={onCancel} className="btn btn-ghost px-4 py-2.5">
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Confirm the role — we can be wrong, so we ask ──────────────── */}
      {stage === 'confirm' && role && (
        <div className="space-y-5">
          {role.title ? (
            <>
              <div className="rounded-xl border border-navy-700 bg-navy-900/40 p-5">
                <p className="label mb-1">What we found</p>
                <p className="font-display text-xl font-bold text-ink">
                  {role.code}
                  {role.title && ` — ${role.title}`}
                </p>
                {role.branch && <p className="mt-1 text-sm text-faint">{role.branch}</p>}
                {role.confidence === 'low' && (
                  <p className="mt-3 text-sm text-low">
                    We’re not certain about this one — please check it before we go on.
                  </p>
                )}
              </div>
              <p className="text-mute">
                If that’s not right, tell us in your own words instead. We’d rather ask than put
                the wrong job on your résumé.
              </p>
            </>
          ) : (
            <p className="text-mute">
              We couldn’t place “{query}” — that’s on us, not you. Describe the job in your own
              words and we’ll go from there.
            </p>
          )}

          <div>
            <label htmlFor="own" className="label mb-2 block">
              {role.title ? 'Or describe it yourself' : 'What did you do?'}
            </label>
            <input
              id="own"
              value={ownTitle}
              onChange={(e) => setOwnTitle(e.target.value)}
              placeholder="e.g. Supply sergeant for a 150-person company"
              className="w-full rounded-lg border border-navy-700 bg-navy-900/60 px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setStage('pick')} className="btn btn-primary px-5 py-2.5">
              {role.title && !ownTitle ? 'Yes, that’s me' : 'Continue'}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setStage('ask')} className="btn btn-ghost px-4 py-2.5">
              <ArrowLeftIcon className="h-4 w-4" />
              Try a different job
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Tick what applies, add your own numbers ────────────────────── */}
      {stage === 'pick' && (
        <div className="space-y-5">
          <p className="text-mute">
            These are things people in your job often did. Tick only the ones that were really
            you — <span className="text-ink">we never add anything you didn’t confirm.</span>
          </p>

          <ul className="space-y-2">
            {allDuties.map((duty) => {
              const on = duty in picked
              return (
                <li key={duty} className="rounded-lg border border-navy-800 bg-navy-900/30">
                  <label className="flex cursor-pointer items-start gap-3 p-3.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(duty)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                        on ? 'border-accent bg-accent text-navy-950' : 'border-navy-600'
                      }`}
                    >
                      {on && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={`text-[0.95rem] leading-relaxed ${on ? 'text-ink' : 'text-mute'}`}>
                      {duty}
                    </span>
                  </label>
                  {on && (
                    <div className="px-3.5 pb-3.5 pl-11">
                      <input
                        value={picked[duty]}
                        onChange={(e) => setPicked((p) => ({ ...p, [duty]: e.target.value }))}
                        placeholder="Any numbers you’re sure of? e.g. 12 people, $2M of equipment"
                        className="w-full rounded-lg border border-navy-700 bg-navy-950/60 px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div>
            <label htmlFor="extra" className="label mb-2 block">
              Did something that isn’t listed?
            </label>
            <div className="flex gap-2">
              <input
                id="extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExtra()
                  }
                }}
                placeholder="Add it in your own words"
                className="flex-1 rounded-lg border border-navy-700 bg-navy-900/60 px-4 py-2.5 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
              <button onClick={addExtra} disabled={!extra.trim()} className="btn btn-ghost px-4 py-2.5">
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={finish} disabled={chosen === 0} className="btn btn-primary px-5 py-2.5">
              Use these {chosen > 0 && `(${chosen})`}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setStage('confirm')} className="btn btn-ghost px-4 py-2.5">
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </button>
            {chosen === 0 && <span className="text-sm text-faint">Tick at least one to continue.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
