import { useEffect, useRef } from 'react'
import { ArrowLeftIcon } from './Icon'

/** The two legal pages, reachable at #privacy and #terms. */
export type LegalSection = 'privacy' | 'terms'

/** A numbered dossier section, matching the result panel's 01 / 02 language. */
function Part({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 first:mt-0">
      <div className="section-head mb-4">
        <span className="section-num">{num}</span>
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-mute">{children}</div>
    </section>
  )
}

/**
 * Privacy note + terms. Deliberately short and in the same plain language as
 * the rest of the app: every claim here is one someone can check against the
 * code in this repo, so keep it accurate if the data flow ever changes.
 */
export function Legal({ section, onBack }: { section: LegalSection; onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Arriving here is a page change — put focus and scroll at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [section])

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-5 py-10 outline-none sm:px-8 lg:py-14">
      <button
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-mute transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to AAR
      </button>

      <div className="step-in">
        {section === 'privacy' ? <Privacy headingRef={headingRef} /> : <Terms headingRef={headingRef} />}
      </div>

      <p className="mt-12 border-t border-rule pt-5 text-sm text-faint">
        {section === 'privacy' ? (
          <>
            Also see the{' '}
            <a href="#terms" className="font-semibold text-steel hover:text-ink">
              terms and disclaimer
            </a>
            .
          </>
        ) : (
          <>
            Also see the{' '}
            <a href="#privacy" className="font-semibold text-steel hover:text-ink">
              privacy note
            </a>
            .
          </>
        )}
      </p>
    </main>
  )
}

function Privacy({ headingRef }: { headingRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-extrabold tracking-tight text-head outline-none"
      >
        Privacy note
      </h1>
      <p className="mt-3 text-mute">
        The short version: your file never leaves your device, the text you type is sent away only to
        write your résumé, and there are no accounts, no tracking, and nothing kept afterwards.
      </p>

      <div className="mt-10">
        <Part num="01" title="Your file or photo stays on your device">
          <p>
            When you upload a PDF, Word file, or photo, it is read{' '}
            <strong className="text-ink">inside your browser</strong>. The text extraction and the
            photo-scanning (OCR) both run on your own device — the file itself is never uploaded
            anywhere, and neither is the picture you take with your camera.
          </p>
        </Part>

        <Part num="02" title="What gets sent when you press Translate">
          <p>
            Only the two blocks of text you entered — your experience and the job description. They go
            to this app’s server function, which passes them to{' '}
            <strong className="text-ink">Anthropic’s Claude API</strong> to write your result, and the
            result streams straight back to you.
          </p>
          <p>
            So the plain truth: <strong className="text-ink">that text does leave your device</strong>,
            and Anthropic processes it to produce the response. Their handling of it is covered by
            Anthropic’s{' '}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-steel hover:text-ink"
            >
              privacy policy
            </a>
            . Only send what you’re comfortable sending — see the{' '}
            <a href="#terms" className="font-semibold text-steel hover:text-ink">
              terms
            </a>{' '}
            for what to leave out.
          </p>
        </Part>

        <Part num="03" title="What is kept, and for how long">
          <p>
            Your experience text, the job description, and your result are{' '}
            <strong className="text-ink">not written to any database</strong>. They exist only for the
            length of the request. There are no accounts and no saved history.
          </p>
          <p>
            The one thing recorded on the server is your{' '}
            <strong className="text-ink">IP address</strong>, used to count requests per hour so a bot
            can’t run up the bill. Those counters are deleted after a day, and they are never linked to
            what you wrote.
          </p>
        </Part>

        <Part num="04" title="What your own browser stores">
          <p>
            Your in-progress draft and your text-size choice are saved in your browser’s local storage
            so a refresh doesn’t lose your work. That never leaves your device, and it’s yours to clear
            — “Start over” wipes the draft, as does clearing site data.
          </p>
          <p>No cookies, no analytics, no advertising or tracking scripts of any kind.</p>
        </Part>

        <Part num="05" title="The other services a page load touches">
          <p>
            Almost none. The fonts and the photo-scanning engine are served from this app rather than
            from anyone else's network, so a page load doesn't tell a third party you were here. If
            human-verification is switched on, Cloudflare Turnstile runs a bot check — it sees that
            check, not your text.
          </p>
        </Part>

        <Part num="06" title="Questions">
          <p>
            AAR is an independent project by Sean Joudrie, not a product of any government or military
            organization. The code is public, so every claim above can be checked against it. If
            something here is unclear, ask — and if the way data is handled ever changes, this page
            changes with it.
          </p>
        </Part>
      </div>
    </>
  )
}

function Terms({ headingRef }: { headingRef: React.Ref<HTMLHeadingElement> }) {
  return (
    <>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-extrabold tracking-tight text-head outline-none"
      >
        Terms &amp; disclaimer
      </h1>
      <p className="mt-3 text-mute">
        AAR gives you a strong first draft. You’re the one who decides what to send — please read it
        over before you do.
      </p>

      <div className="mt-10">
        <Part num="01" title="It’s a draft, not a finished résumé">
          <p>
            The wording, the match score, and the interview answers are all generated by an AI model.
            It is told never to invent numbers, awards, or duties you didn’t describe — but it can still
            get things wrong, misread a term, or word something in a way that doesn’t sound like you.
          </p>
          <p>
            <strong className="text-ink">Read every line before you use it.</strong> Anything you send
            to an employer is your statement, so it needs to be accurate and true to your service.
          </p>
        </Part>

        <Part num="02" title="Don’t paste anything sensitive">
          <p>
            Leave out classified and controlled information, full SSNs and DoD ID numbers, and details
            that shouldn’t be public — specific units, locations, deployments, dates, or the names of
            people you served with. Describe roles, responsibilities, and skills instead. A résumé
            doesn’t need the specifics, and this app doesn’t either.
          </p>
        </Part>

        <Part num="03" title="No guarantees">
          <p>
            AAR is provided as-is, with no promise of a particular result — no guarantee of an
            interview, an offer, or that any employer or applicant-tracking system will read it a
            certain way. The match score is one honest estimate of fit, not a prediction and not
            professional career, legal, or hiring advice.
          </p>
        </Part>

        <Part num="04" title="Your words stay yours">
          <p>
            You keep every right to what you enter and to the résumé you get back — use it however you
            like. No ownership over it is claimed here.
          </p>
        </Part>

        <Part num="05" title="Fair use of the service">
          <p>
            Each translation costs real money to run, so requests are rate-limited per hour and input
            length is capped. Please don’t script it, resell it, or use it to generate experience that
            isn’t yours.
          </p>
        </Part>
      </div>
    </>
  )
}
