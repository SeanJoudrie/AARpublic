/** Covered vs. missing JD keywords — the candidate's gap analysis at a glance. */
export function KeywordChips({
  covered,
  missing,
}: {
  covered: string[]
  missing: string[]
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-good" />
          <span className="label text-good/90">You already show ({covered.length})</span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {covered.map((k, i) => (
            <li
              key={k}
              className="token fade-up border-good/25 bg-good/10 text-good"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {k}
            </li>
          ))}
          {covered.length === 0 && (
            <li className="text-sm text-mute">
              Nothing matched yet — this role may be a stretch. The gaps on the right show what to build toward.
            </li>
          )}
        </ul>
      </div>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="label text-accent/90">Worth adding ({missing.length})</span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {missing.map((k, i) => (
            <li
              key={k}
              className="token fade-up border-accent/25 bg-accent/10 text-accent"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {k}
            </li>
          ))}
          {missing.length === 0 && <li className="text-sm text-good">Nothing missing — strong match.</li>}
        </ul>
      </div>
    </div>
  )
}
