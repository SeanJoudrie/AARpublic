import { useEffect, useRef, useState } from 'react'
import { Field } from './Field'
import { SAMPLE_RESUME } from '../data/samples'
import { extractText, UnsupportedFileError } from '../lib/parseFile'
import { isImageFile, runOcr } from '../lib/ocr'
import { UploadIcon, CameraIcon, LockIcon, ArrowRightIcon, DocIcon, InfoIcon } from './Icon'
import { GuidedIntake } from './GuidedIntake'

const PLACEHOLDERS = [
  'e.g. I was a squad leader in charge of 12 soldiers and $2 million of equipment…',
  'e.g. I ran supply and logistics for a company of 150 people…',
  'e.g. I was a combat medic responsible for training and readiness…',
  'e.g. I managed communications and coordinated across three units…',
]

/** Step 1 — get the service member's experience in, by upload, photo, or paste. */
export function StepRecord({
  resume,
  onResume,
  onNext,
}: {
  resume: string
  onResume: (v: string) => void
  onNext: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<null | string>(null)
  const [ocrPct, setOcrPct] = useState<number | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [phIndex, setPhIndex] = useState(0)
  const [guided, setGuided] = useState(false)
  const ready = resume.trim().length > 0

  // Rotate the placeholder while the box is empty, for a little life + ideas.
  useEffect(() => {
    if (resume) return
    const id = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 3800)
    return () => clearInterval(id)
  }, [resume])

  const ingest = async (file: File | undefined) => {
    if (!file) return
    setFileError(null)
    try {
      if (isImageFile(file)) {
        // Photo / scan → OCR on-device.
        setBusy('Reading your photo…')
        setOcrPct(0)
        const text = await runOcr(file, (p) => setOcrPct(p))
        if (!text) setFileError('We couldn’t find text in that photo. Try better lighting or type it in.')
        else {
          onResume(text)
          setFileName(file.name)
        }
      } else {
        // Document → parse.
        setBusy('Reading your file…')
        const text = await extractText(file)
        if (!text) setFileError('We couldn’t read any text from that file. Try pasting instead.')
        else {
          onResume(text)
          setFileName(file.name)
        }
      }
    } catch (e) {
      setFileError(
        e instanceof UnsupportedFileError ? e.message : 'That file didn’t work. Try pasting instead.',
      )
    } finally {
      setBusy(null)
      setOcrPct(null)
    }
  }

  // Gentle heads-up if what they pasted looks like a job posting, not a record.
  const looksLikeJD =
    resume.length > 70 &&
    [/responsibilities:/i, /requirements:/i, /we are looking for/i, /the ideal candidate/i, /qualifications:/i, /you will\b/i, /about the role/i]
      .filter((re) => re.test(resume)).length >= 2

  // The guided path takes over the step. When it finishes it fills the box
  // below rather than jumping ahead — they should see what was built in their
  // name and be able to change it before anything is translated.
  if (guided) {
    return (
      <GuidedIntake
        onDone={(text) => {
          onResume(text)
          setGuided(false)
        }}
        onCancel={() => setGuided(false)}
      />
    )
  }

  return (
    <div
      className={`fade-up space-y-6 rounded-2xl transition-colors ${dragging ? 'outline-2 outline-dashed outline-accent/60 outline-offset-8' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        ingest(e.dataTransfer.files?.[0])
      }}
    >
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">
          First, tell us about your service.
        </h2>
        <p className="mt-2 text-mute">
          Upload a file, snap a photo of a paper copy, or just type what you did. Don’t worry about
          wording — that’s our whole job.
        </p>
      </div>

      {/* hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,image/*"
        aria-label="Upload a PDF, Word, text, or image file of your record"
        className="hidden"
        onChange={(e) => ingest(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a photo of your record"
        className="hidden"
        onChange={(e) => ingest(e.target.files?.[0])}
      />

      {busy ? (
        <div className="border border-edge bg-surface px-5 py-7 text-center" style={{ borderRadius: 12 }}>
          <p className="text-sm font-semibold text-steel">{busy}</p>
          <div className="mx-auto mt-4 h-1 w-full max-w-xs overflow-hidden rounded-full bg-rule">
            {ocrPct !== null ? (
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round(ocrPct * 100)}%` }}
              />
            ) : (
              <div className="scanbar h-full w-full" />
            )}
          </div>
        </div>
      ) : (
        <>
        {/* The path for someone with no résumé at all — listed first because
            it's the one that unblocks the least-equipped user. */}
        {!ready && (
          <button
            type="button"
            onClick={() => setGuided(true)}
            style={{ borderRadius: 12 }}
            className="flex w-full items-center gap-4 border border-accent/40 bg-accent/[0.06] px-5 py-4 text-left transition-colors hover:border-accent hover:bg-accent/10"
          >
            <InfoIcon className="h-5 w-5 shrink-0 text-accent" />
            <span>
              <span className="block text-base font-semibold text-ink">
                No résumé? Build it with me.
              </span>
              <span className="mt-0.5 block text-sm text-mute">
                Tell us your job code — like 11B — and we’ll walk through what you did.
              </span>
            </span>
            <ArrowRightIcon className="ml-auto h-4 w-4 shrink-0 text-accent" />
          </button>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {/* upload */}
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              ingest(e.dataTransfer.files?.[0])
            }}
            onClick={() => fileRef.current?.click()}
            style={{ borderRadius: 12 }}
            className={`flex flex-col items-center gap-2 border px-4 py-6 text-center text-sm transition-colors ${
              dragging ? 'border-accent bg-accent/5 text-ink' : 'border-rule-strong text-mute hover:border-steel'
            }`}
          >
            <UploadIcon className="h-6 w-6 text-steel" />
            <span className="text-base font-semibold text-ink">Upload a file</span>
            <span>PDF, Word, or text — drop or click</span>
          </button>

          {/* camera / photo */}
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            style={{ borderRadius: 12 }}
            className="flex flex-col items-center gap-2 border border-rule-strong px-4 py-6 text-center text-sm text-mute transition-colors hover:border-steel"
          >
            <CameraIcon className="h-6 w-6 text-steel" />
            <span className="text-base font-semibold text-ink">Scan a photo</span>
            <span>Take a picture of a paper copy</span>
          </button>
        </div>
        </>
      )}
      {fileError && <p className="text-sm font-medium text-accent">{fileError}</p>}

      {fileName && !busy && (
        <div className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-2 text-sm">
          <DocIcon className="h-4 w-4 shrink-0 text-steel" />
          <span className="truncate text-ink">{fileName}</span>
          <span className="text-good">·</span>
          <span className="text-xs text-good">read in</span>
          <button
            onClick={() => {
              onResume('')
              setFileName(null)
            }}
            className="ml-auto text-xs font-semibold text-faint transition-colors hover:text-accent"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-rule" />
        or type it below
        <span className="h-px flex-1 bg-rule" />
      </div>

      <div>
        <Field
          label="What you did in the military"
          placeholder={PLACEHOLDERS[phIndex]}
          value={resume}
          rows={8}
          onChange={(v) => {
            onResume(v)
            if (fileName) setFileName(null)
          }}
          tools
          minWordsHint={12}
        />
        <button
          onClick={() => onResume(SAMPLE_RESUME)}
          className="btn btn-ghost mt-2 px-3 py-1.5 text-xs"
        >
          Not sure what to write? Fill in an example
        </button>
      </div>

      {looksLikeJD && (
        <p className="border-l-2 border-steel py-1 pl-3 text-xs text-steel">
          Heads-up: this looks like a job posting. Your <em>own experience</em> goes here — the job
          description comes in the next step.
        </p>
      )}

      {/* trust badge */}
      <p className="flex items-center gap-2 border-l-2 border-rule-strong py-1 pl-3 text-xs text-mute">
        <LockIcon className="h-4 w-4 shrink-0 text-faint" />
        Files and photos are read right here on your device. We don’t save or upload your record.
      </p>

      <div className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-5 max-sm:border-t max-sm:border-rule max-sm:bg-ground/95 max-sm:px-5 max-sm:py-3 max-sm:backdrop-blur">
        <button onClick={onNext} disabled={!ready} className="btn btn-primary w-full px-6 py-3.5">
          Next: the job you want
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
