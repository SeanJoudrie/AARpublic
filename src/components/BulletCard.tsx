import { useState } from 'react'
import type { Bullet } from '../lib/types'
import { CopyIcon, CheckIcon } from './Icon'

/** One translated bullet: civilian rewrite, editable + re-phrasable before
 *  copying, with the original + rationale on demand. A hairline-separated row. */
export function BulletCard({
  bullet,
  index,
  onRephrase,
}: {
  bullet: Bullet
  index: number
  onRephrase: (bullet: string) => Promise<string[]>
}) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(bullet.translated)
  const [alts, setAlts] = useState<string[] | null>(null)
  const [rephrasing, setRephrasing] = useState(false)
  const edited = text.trim() !== bullet.translated.trim()

  const doRephrase = async () => {
    setRephrasing(true)
    setAlts(null)
    try {
      setAlts(await onRephrase(text))
    } catch {
      setAlts([])
    } finally {
      setRephrasing(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  return (
    <div
      className="fade-up border-t border-navy-800 py-5 first:border-t-0"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex items-start gap-4">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        {editing ? (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setEditing(false)}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-accent bg-navy-900/60 px-3 py-2 text-[0.95rem] leading-relaxed text-ink focus:outline-none"
          />
        ) : (
          <p
            className="flex-1 cursor-text text-[0.95rem] leading-relaxed text-ink"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {text}
          </p>
        )}
        <button
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy this bullet'}
          className="btn btn-ghost shrink-0 px-2.5 py-1 text-xs"
        >
          <span className="transition-transform duration-200" style={{ transform: copied ? 'scale(1.1)' : 'scale(1)' }}>
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-good" /> : <CopyIcon className="h-3.5 w-3.5" />}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-6">
        {bullet.keywords.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {bullet.keywords.map((k) => (
              <li key={k} className="token border-navy-700 bg-navy-850 text-steel">
                {k}
              </li>
            ))}
          </ul>
        )}
        {edited && <span className="text-xs font-medium text-accent/80">edited</span>}
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs font-semibold text-faint transition-colors hover:text-mute"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={doRephrase}
          disabled={rephrasing}
          className="text-xs font-semibold text-faint transition-colors hover:text-mute disabled:opacity-50"
        >
          {rephrasing ? 'Rephrasing…' : 'Rephrase'}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-faint transition-colors hover:text-mute"
        >
          {open ? 'Hide original' : 'Show original'}
        </button>
      </div>

      {alts && (
        <div className="mt-3 space-y-1.5 pl-6">
          {alts.length === 0 ? (
            <p className="text-xs text-accent">Couldn’t fetch alternatives — try again.</p>
          ) : (
            <>
              <p className="label">Pick a rewrite</p>
              {alts.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setText(a)
                    setAlts(null)
                  }}
                  className="block w-full rounded-lg border border-navy-700 bg-navy-900/50 px-3 py-2 text-left text-sm text-mute transition-colors hover:border-accent hover:text-ink"
                >
                  {a}
                </button>
              ))}
              <button onClick={() => setAlts(null)} className="text-xs font-semibold text-faint hover:text-mute">
                Keep current
              </button>
            </>
          )}
        </div>
      )}

      {/* smooth height transition via grid-rows 0fr→1fr */}
      <div
        className="grid pl-6 transition-all duration-300"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-mute">
              <span className="label mr-2">Original</span>
              {bullet.original}
            </p>
            <p className="text-mute">
              <span className="label mr-2">Why</span>
              {bullet.rationale}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
