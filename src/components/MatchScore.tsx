import { useEffect, useState } from 'react'
import { InfoTip } from './InfoTip'

/** Fit-score band: red-ish stretch, gold decent, green strong. */
function band(v: number) {
  if (v >= 70) return { color: 'var(--color-good)', word: 'Strong fit' }
  if (v >= 45) return { color: 'var(--color-accent)', word: 'Decent fit' }
  return { color: 'var(--color-low)', word: 'A stretch' }
}

/** Animated circular fit score, 0-100, with a small settle at the end. */
export function MatchScore({ score }: { score: number }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(score)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 850
    // Slight overshoot then settle for a bit of life at the end.
    const ease = (p: number) => {
      const c1 = 1.2
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2)
    }
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setShown(Math.round(ease(p) * score))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setShown(score)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const R = 52
  const C = 2 * Math.PI * R
  const offset = C * (1 - Math.min(100, Math.max(0, shown)) / 100)
  const { color, word } = band(shown)

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-navy-800)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-extrabold text-head">{shown}</span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-faint">/ 100</span>
        </div>
      </div>
      <div>
        <p className="label flex items-center gap-1.5">
          Match score
          <InfoTip label="0–100 fit between your résumé and this job. Under ~45 is a stretch, 45–70 is decent, 70+ is strong. It's honest on purpose — a weak match scores low so you know where you stand." />
        </p>
        <p className="mt-1 flex items-center gap-2 font-display text-sm font-bold" style={{ color }}>
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {word}
        </p>
        <p className="mt-1 max-w-xs text-sm text-mute">
          Honest fit between this résumé and the target job — after translation.
        </p>
      </div>
    </div>
  )
}
