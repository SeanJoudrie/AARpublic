import { useEffect, useState } from 'react'
import { SpeakerIcon, StopIcon } from './Icon'

/**
 * Speaker button that reads text out loud with the browser's built-in
 * text-to-speech — free, no API. Some people absorb the result better by ear,
 * and it doubles as interview rehearsal. Renders nothing if the browser has no
 * speech support.
 */
export function ReadAloud({ text, className = '' }: { text: string; className?: string }) {
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Stop any speech if this button unmounts.
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel() }, [supported])

  if (!supported) return null

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.98
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
      className={`btn btn-ghost px-2.5 py-1 text-xs ${className}`}
    >
      {speaking ? <StopIcon className="h-3.5 w-3.5" /> : <SpeakerIcon className="h-3.5 w-3.5" />}
      {speaking ? 'Stop' : 'Read aloud'}
    </button>
  )
}
