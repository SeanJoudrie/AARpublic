import { useLayoutEffect, useRef, useState } from 'react'

/** Labeled textarea used across the wizard steps, with optional writing tools:
 *  a word counter, a short-input hint, clear, and paste-from-clipboard. Grows
 *  with its content so long records aren't trapped in a tiny box. */
export function Field({
  label,
  placeholder,
  value,
  rows,
  onChange,
  onKeyDown,
  tools = false,
  minWordsHint,
}: {
  label: string
  placeholder: string
  value: string
  rows: number
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  tools?: boolean
  minWordsHint?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [pasteError, setPasteError] = useState(false)

  // Auto-grow to fit content (with the given rows as a floor).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const words = value.trim() ? value.trim().split(/\s+/).length : 0
  const tooShort = minWordsHint != null && words > 0 && words < minWordsHint

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) onChange(text)
    } catch {
      setPasteError(true)
      setTimeout(() => setPasteError(false), 2000)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-mute">{label}</span>
        {tools && value.trim() && (
          <span className="text-xs tabular-nums text-faint">{words} words</span>
        )}
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{ minHeight: `${rows * 1.6 + 1.5}rem` }}
        className="w-full resize-none overflow-hidden rounded-xl border border-navy-700 bg-navy-900/60 px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />
      {tools && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            onClick={paste}
            className="text-xs font-semibold text-steel underline decoration-navy-600 underline-offset-4 transition-colors hover:text-ink hover:decoration-accent"
          >
            Paste from clipboard
          </button>
          {value.trim() && (
            <button
              onClick={() => onChange('')}
              className="text-xs font-semibold text-faint transition-colors hover:text-mute"
            >
              Clear
            </button>
          )}
          {pasteError && <span className="text-xs text-accent">Couldn’t read the clipboard — paste with Ctrl/⌘+V.</span>}
          {tooShort && (
            <span className="text-xs text-accent/90">A little short — add a few more details for a better result.</span>
          )}
        </div>
      )}
    </div>
  )
}
