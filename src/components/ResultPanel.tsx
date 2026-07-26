import { useEffect, useRef, useState } from 'react'
import type { TranslateResult } from '../lib/types'
import { MatchScore } from './MatchScore'
import { KeywordChips } from './KeywordChips'
import { BulletCard } from './BulletCard'
import { StarPrep } from './StarPrep'
import { NextSteps } from './NextSteps'
import { InfoTip } from './InfoTip'
import { ReadAloud } from './ReadAloud'
import { CopyIcon, CheckIcon, DocIcon } from './Icon'
import { Glossary } from './Glossary'
import { copyAll, exportDocx, exportPdf } from '../lib/exportDoc'
import { findAcronyms } from '../lib/glossary'

const JUMPS = [
  { id: 'sec-keywords', label: 'Keywords' },
  { id: 'sec-bullets', label: 'Bullets' },
  { id: 'sec-star', label: 'Interview' },
]

export function ResultPanel({
  result,
  loading,
  error,
  progress,
  onRetry,
  onRephrase,
  jobTitle,
}: {
  result: TranslateResult | null
  loading: boolean
  error: string | null
  progress: string[]
  onRetry: () => void
  onRephrase: (bullet: string, instruction?: string) => Promise<string[]>
  jobTitle: string
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const scoreRef = useRef<HTMLDivElement>(null)
  const [showMini, setShowMini] = useState(false)

  // Move focus to the results heading + announce for screen readers.
  useEffect(() => {
    if (result) headingRef.current?.focus()
  }, [result])

  // Reveal the sticky mini-header once the score panel scrolls out of view.
  useEffect(() => {
    const el = scoreRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setShowMini(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [result])

  if (loading) return <Streaming bullets={progress} />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (!result) return <Empty />

  return (
    <div className="space-y-12">
      <div aria-live="polite" className="sr-only">
        Translation ready. Match score {result.matchScore} out of 100.
      </div>

      {/* Sticky mini-header for small screens. On desktop the rail already
          carries the score and the jump nav, so this would just duplicate it. */}
      <div
        className={`no-print sticky top-0 z-20 -mx-1 mb-2 flex items-center gap-3 rounded-b-xl border-b border-rule-strong bg-ground px-3 py-2 transition-all lg:hidden ${
          showMini ? 'opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <span className="font-display text-lg font-extrabold text-head">{result.matchScore}</span>
        <span className="label">fit</span>
        <div className="ml-auto flex gap-1.5">
          {JUMPS.map((j) => (
            <a key={j.id} href={`#${j.id}`} className="btn btn-ghost px-2.5 py-1 text-xs">
              {j.label}
            </a>
          ))}
        </div>
      </div>

      {/* The verdict leads. This is what they came for — it used to sit below a
          block of instructions explaining how to use a thing they hadn't seen. */}
      <section ref={scoreRef} className="fade-up border border-edge bg-surface p-6" style={{ borderRadius: 14 }}>
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="mb-5 font-display text-lg font-bold text-ink outline-none"
        >
          Your result{jobTitle && <span className="text-mute"> for {jobTitle}</span>}
        </h3>
        <MatchScore score={result.matchScore} />
        {result.matchScore >= 90 && (
          <p className="mt-4 rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">
            Excellent match — you’re a strong candidate for this role. Lead with the summary below.
          </p>
        )}
        <div className="mt-5 flex items-start justify-between gap-4 border-t border-rule pt-5">
          <p className="text-[0.95rem] leading-relaxed text-mute">{result.summary}</p>
          <ReadAloud text={result.summary} className="shrink-0" />
        </div>
      </section>

      <ExportBar result={result} jobTitle={jobTitle} />

      {/* Demoted to sit with the export buttons, which is the moment the
          instructions actually become useful. */}
      <NextSteps />

      <Section id="sec-keywords" n="01" title="What this job wants" delay={0} tip="Green = skills your experience already shows. Gold = skills the job asks for that we didn't see yet — good things to add or bring up in an interview.">
        <KeywordChips covered={result.coveredKeywords} missing={result.missingKeywords} />
      </Section>

      <Section id="sec-bullets" n="02" title="Your experience, in civilian words" delay={80} tip="Each line rewritten the way a recruiter expects to read it. Click a line to edit it, 'Copy' to grab it, or 'Show original' to see how it maps back.">
        <div>
          {result.bullets.map((b, i) => (
            <BulletCard key={i} bullet={b} index={i} onRephrase={onRephrase} />
          ))}
        </div>
        <Glossary hits={findAcronyms(result.bullets.map((b) => b.original).join(' '))} />
      </Section>

      <Section id="sec-star" n="03" title="Interview practice" delay={160} tip="STAR is the proven way to answer interview questions: Situation, Task, Action, Result. Read these out loud to practice.">
        <StarPrep answers={result.starAnswers} />
      </Section>
    </div>
  )
}

function Section({
  id,
  n,
  title,
  tip,
  delay,
  children,
}: {
  id: string
  n: string
  title: string
  tip: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="fade-up scroll-mt-20" style={{ animationDelay: `${delay}ms` }}>
      <div className="section-head mb-6">
        <span className="section-num">{n}</span>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          {title}
          <InfoTip label={tip} />
        </h3>
      </div>
      {children}
    </section>
  )
}

function ExportBar({ result, jobTitle }: { result: TranslateResult; jobTitle: string }) {
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }
  return (
    <div className="no-print border-y border-rule py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mr-2 flex items-center gap-1.5">
          Save your résumé
          <InfoTip label="“Copy all” puts everything on your clipboard. Word (.docx) is a file you can keep editing. PDF is ready to send to an employer. Each includes your summary, bullets, and interview prep." />
        </span>
        <button
          onClick={async () => {
            if (await copyAll(result)) {
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            }
          }}
          className="btn btn-ghost px-3 py-1.5 text-sm"
        >
          {copied ? <CheckIcon className="h-4 w-4 text-good" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
        <button
          onClick={() => {
            exportDocx(result, jobTitle)
            flash('Downloading Word file…')
          }}
          className="btn btn-ghost px-3 py-1.5 text-sm"
        >
          <DocIcon className="h-4 w-4" />
          Word
        </button>
        <button
          onClick={() => {
            exportPdf(result, jobTitle)
            flash('Downloading PDF…')
          }}
          className="btn btn-ghost px-3 py-1.5 text-sm"
        >
          <DocIcon className="h-4 w-4" />
          PDF
        </button>
        {toast && <span className="text-xs font-medium text-good">{toast}</span>}
      </div>
      <p className="mt-3 text-xs text-faint">
        We never invent numbers or awards you didn’t give us — always read it over before you send it.
      </p>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const rateLimited = /rate limit/i.test(error)
  return (
    <div className="border-l-2 border-accent bg-accent/5 px-5 py-5">
      <p className="text-sm text-accent">{error}</p>
      <p className="mt-1 text-sm text-mute">
        {rateLimited
          ? 'You’ve run several translations in a short time. Give it a few minutes, then try again.'
          : 'This is usually a temporary hiccup or a dropped connection.'}
      </p>
      {!rateLimited && (
        <button onClick={onRetry} className="btn btn-ghost mt-4 px-4 py-2 text-sm">
          Try again
        </button>
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="grid h-full min-h-64 place-items-center border border-dashed border-rule-strong p-10 text-center" style={{ borderRadius: 14 }}>
      <div>
        <p className="font-display text-lg font-semibold text-mute">Your translation lands here.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-faint">
          Finish the two steps on the left and we’ll build your recruiter-ready résumé.
        </p>
      </div>
    </div>
  )
}

const NARRATION = [
  'Reading your experience',
  'Matching it to the job',
  'Rewriting it in civilian words',
  'Scoring your fit',
  'Writing your interview answers',
]

function Streaming({ bullets }: { bullets: string[] }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => Math.min(p + 1, NARRATION.length - 1)), 1600)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-steel">
          {bullets.length
            ? `Almost there — ${bullets.length} line${bullets.length > 1 ? 's' : ''} rewritten`
            : `${NARRATION[phase]}…`}
        </p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-rule">
          <div className="scanbar h-full w-full" />
        </div>
      </div>

      <div>
        {bullets.map((b, i) => (
          <div key={i} className="fade-up flex items-start gap-4 border-t border-rule py-5 first:border-t-0">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <p className="text-[0.95rem] leading-relaxed text-ink">{b}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
