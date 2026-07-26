import { useState } from 'react'
import type { StarAnswer } from '../lib/types'
import { ReadAloud } from './ReadAloud'
import { CopyIcon, CheckIcon } from './Icon'
import { starToText } from '../lib/exportDoc'

/** Copy one STAR answer to the clipboard. */
function CopyAnswer({ a, n }: { a: StarAnswer; n: number }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy this answer"
      onClick={(e) => {
        e.preventDefault()
        navigator.clipboard.writeText(starToText(a, n)).then(
          () => {
            setDone(true)
            setTimeout(() => setDone(false), 1400)
          },
          () => {},
        )
      }}
      className="btn btn-ghost px-2.5 py-1 text-xs"
    >
      {done ? <CheckIcon className="h-3.5 w-3.5 text-good" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

const ROWS: { key: keyof Pick<StarAnswer, 'situation' | 'task' | 'action' | 'result'>; label: string }[] = [
  { key: 'situation', label: 'S — Situation' },
  { key: 'task', label: 'T — Task' },
  { key: 'action', label: 'A — Action' },
  { key: 'result', label: 'R — Result' },
]

/** Flatten a STAR answer into one spoken paragraph for read-aloud. */
function spoken(a: StarAnswer): string {
  return `${a.question} ${a.situation} ${a.task} ${a.action} ${a.result}`
}

/** STAR-format interview prep for the questions this JD is likely to ask. */
export function StarPrep({ answers }: { answers: StarAnswer[] }) {
  // `epoch` bumps to force every <details> to re-mount with a new default open
  // state — a simple expand-all / collapse-all without controlling each one.
  const [allOpen, setAllOpen] = useState<boolean | null>(null)
  const [epoch, setEpoch] = useState(0)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setAllOpen((v) => !(v ?? true))
            setEpoch((e) => e + 1)
          }}
          className="text-xs font-semibold text-steel transition-colors hover:text-ink"
        >
          {allOpen === false ? 'Expand all' : 'Collapse all'}
        </button>
      </div>
      {answers.map((a, i) => (
        <details
          key={`${epoch}-${i}`}
          open={allOpen ?? i === 0}
          className="group border border-edge bg-surface p-5"
          style={{ borderRadius: 12 }}
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-display text-base font-semibold text-ink marker:content-none">
            <span>
              <span className="mr-2 text-accent">Q{i + 1}.</span>
              {a.question}
            </span>
            <span className="flex shrink-0 gap-1.5">
              <CopyAnswer a={a} n={i + 1} />
              <ReadAloud text={spoken(a)} />
            </span>
          </summary>
          <dl className="mt-4 space-y-3">
            {ROWS.map((r) => (
              <div key={r.key} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="label pt-0.5 text-steel">{r.label}</dt>
                <dd className="text-sm leading-relaxed text-mute">{a[r.key]}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  )
}
