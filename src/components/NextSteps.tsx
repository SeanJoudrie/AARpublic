/** Tells the user exactly what to do with their result — no guessing. */
export function NextSteps({ headingRef }: { headingRef?: React.Ref<HTMLHeadingElement> }) {
  const steps = [
    'Read each line below. Use “Copy” on the ones that fit and paste them into your résumé.',
    'Download your résumé as a Word or PDF file with the buttons up top.',
    'Practice your interview answers out loud — use “Read aloud” to hear them.',
  ]
  return (
    <section className="fade-up">
      <div className="section-head mb-5">
        <span className="section-num">→</span>
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-lg font-bold text-ink outline-none">
          Here’s what to do next
        </h3>
      </div>
      <ol className="space-y-3">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-steel/40 font-display text-xs font-bold text-steel">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm leading-relaxed text-mute">{text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
