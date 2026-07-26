import { useEffect, useState } from 'react'

// Scales the whole UI by setting the root font-size — every rem-based size
// grows with it. Choice is remembered across visits. Directly serves "ease of
// view" for anyone who wants bigger text.

const LEVELS = [
  { key: 'A', label: 'Normal text size', px: 16 },
  { key: 'A+', label: 'Large text size', px: 18 },
  { key: 'A++', label: 'Extra large text size', px: 20 },
] as const

const STORAGE_KEY = 'aar-text-size'

export function TextSizeControl() {
  const [px, setPx] = useState(16)

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    if (saved) setPx(saved)
  }, [])

  useEffect(() => {
    document.documentElement.style.fontSize = `${px}px`
    localStorage.setItem(STORAGE_KEY, String(px))
  }, [px])

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Text size">
      {LEVELS.map((l) => (
        <button
          key={l.key}
          type="button"
          aria-label={l.label}
          aria-pressed={px === l.px}
          onClick={() => setPx(l.px)}
          className={`grid min-h-9 min-w-9 place-items-center rounded-md px-2 font-display font-bold leading-none transition-colors ${
            px === l.px ? 'bg-accent text-navy-950' : 'text-mute hover:text-ink'
          }`}
          style={{ fontSize: `${0.7 + (l.px - 16) * 0.03}rem` }}
        >
          {l.key}
        </button>
      ))}
    </div>
  )
}
