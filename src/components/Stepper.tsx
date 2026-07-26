const STEPS = ['Your service', 'The job', 'Your translation']

/** Plain "Step 1 of 3" progress so the tool reads as a short, finishable form. */
export function Stepper({ step, onJump }: { step: number; onJump: (s: number) => void }) {
  return (
    <div className="mb-10">
      <p className="label mb-3">
        Step {step} of {STEPS.length} · {STEPS[step - 1]}
      </p>
      <div className="flex gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const current = n === step
          return (
            <button
              key={label}
              type="button"
              // Only allow jumping back to a completed step, never skipping ahead.
              disabled={n >= step}
              onClick={() => onJump(n)}
              aria-label={`Step ${n}: ${label}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                done ? 'cursor-pointer bg-accent/60 hover:bg-accent' : current ? 'bg-accent' : 'bg-navy-700'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
