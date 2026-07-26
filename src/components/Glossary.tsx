import type { GlossaryHit } from '../lib/glossary'

/** "Military terms we spotted" — plain-English definitions for the jargon found
 *  in the user's own record, so a recruiter (and the user) can decode it. */
export function Glossary({ hits }: { hits: GlossaryHit[] }) {
  if (hits.length === 0) return null
  return (
    <details className="mt-8 border border-navy-700 bg-navy-900/30 p-5" style={{ borderRadius: 12 }}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink marker:content-none">
        <span className="label text-steel">Military terms we spotted ({hits.length})</span>
        <span className="text-xs font-normal text-faint">— plain-English translations</span>
      </summary>
      <dl className="mt-4 space-y-2.5">
        {hits.map((h) => (
          <div key={h.term} className="grid gap-1 sm:grid-cols-[6rem_1fr] sm:gap-4">
            <dt className="font-display text-sm font-bold text-accent">{h.term}</dt>
            <dd className="text-sm leading-relaxed text-mute">{h.def}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
