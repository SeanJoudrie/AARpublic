// One consistent line-icon set — single 1.5px stroke, currentColor, 24-grid.
// Replaces every emoji and stray font glyph so the UI reads as designed, not
// vibe-coded.
type Props = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function UploadIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 15V4m0 0L8 8m4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function CameraIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <circle cx="12.5" cy="12.5" r="3.2" />
    </svg>
  )
}

export function LockIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="9" rx="1.6" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function SpeakerIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 9v6h3.5L13 19V5L7.5 9H4Z" />
      <path d="M16.5 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" />
    </svg>
  )
}

export function StopIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  )
}

export function CopyIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  )
}

export function DocIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M6 3h8l4 4v14a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V3Z" />
      <path d="M14 3v4h4" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 12h15m0 0-5-5m5 5-5 5" />
    </svg>
  )
}

export function ArrowLeftIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 12H5m0 0 5-5m-5 5 5 5" />
    </svg>
  )
}

export function InfoIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function RefreshIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 8a8 8 0 1 0 1 5" />
      <path d="M20 3v5h-5" />
    </svg>
  )
}
