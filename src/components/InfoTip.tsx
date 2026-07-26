import { useState } from 'react'
import { InfoIcon } from './Icon'

/**
 * A small "?" that explains a term in plain language — so a first-time civilian
 * job seeker isn't stopped by words like "match score" or "STAR". Shows on
 * hover, keyboard focus, and tap (for phones).
 */
export function InfoTip({ label }: { label: string }) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`What's this? ${label}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className="text-faint transition-colors hover:text-accent"
      >
        <InfoIcon className="h-4 w-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-xl"
        >
          {label}
        </span>
      )}
    </span>
  )
}
