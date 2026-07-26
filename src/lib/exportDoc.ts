// Turn a TranslateResult into a downloadable résumé document. The whole point
// of AAR is producing a document, so this closes the loop: DOCX (editable),
// PDF, and plain-text copy-all — each including the summary, the bullets, and
// the STAR interview prep. Heavy libs are dynamically imported so they only
// download on first export.
import type { TranslateResult } from './types'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** A filename-safe slug from the target job title (falls back to "aar-resume"). */
export function fileBase(title?: string): string {
  const slug = (title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug ? `aar-${slug}` : 'aar-resume'
}

/** Everything as one clean plain-text block. */
export function toPlainText(r: TranslateResult): string {
  const lines = ['PROFESSIONAL SUMMARY', r.summary, '', 'EXPERIENCE']
  for (const b of r.bullets) lines.push(`• ${b.translated}`)
  lines.push('', 'INTERVIEW PREP (STAR)')
  r.starAnswers.forEach((a, i) => {
    lines.push(
      `${i + 1}. ${a.question}`,
      `   Situation: ${a.situation}`,
      `   Task: ${a.task}`,
      `   Action: ${a.action}`,
      `   Result: ${a.result}`,
      '',
    )
  })
  return lines.join('\n').trim()
}

export async function copyAll(r: TranslateResult): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(toPlainText(r))
    return true
  } catch {
    return false
  }
}

export async function exportDocx(r: TranslateResult, title?: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
  const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2 })
  const doc = new Document({
    sections: [
      {
        children: [
          heading('Professional Summary'),
          new Paragraph({ children: [new TextRun(r.summary)] }),
          new Paragraph({ text: '' }),
          heading('Experience'),
          ...r.bullets.map((b) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(b.translated)] })),
          new Paragraph({ text: '' }),
          heading('Interview Prep (STAR)'),
          ...r.starAnswers.flatMap((a, i) => [
            new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${a.question}`, bold: true })] }),
            new Paragraph({ children: [new TextRun({ text: 'Situation: ', bold: true }), new TextRun(a.situation)] }),
            new Paragraph({ children: [new TextRun({ text: 'Task: ', bold: true }), new TextRun(a.task)] }),
            new Paragraph({ children: [new TextRun({ text: 'Action: ', bold: true }), new TextRun(a.action)] }),
            new Paragraph({ children: [new TextRun({ text: 'Result: ', bold: true }), new TextRun(a.result)] }),
            new Paragraph({ text: '' }),
          ]),
        ],
      },
    ],
  })
  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${fileBase(title)}.docx`)
}

export async function exportPdf(r: TranslateResult, title?: string) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 56
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  const pageHeight = pdf.internal.pageSize.getHeight()
  let y = margin

  const line = (text: string, size: number, bold = false, gap = 6) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    for (const seg of pdf.splitTextToSize(text, width)) {
      if (y > pageHeight - margin) {
        pdf.addPage()
        y = margin
      }
      pdf.text(seg, margin, y)
      y += size + gap
    }
  }

  line('Professional Summary', 13, true, 8)
  line(r.summary, 10.5, false, 12)
  line('Experience', 13, true, 8)
  for (const b of r.bullets) line(`•  ${b.translated}`, 10.5, false, 8)
  y += 8
  line('Interview Prep (STAR)', 13, true, 8)
  r.starAnswers.forEach((a, i) => {
    line(`${i + 1}. ${a.question}`, 11, true, 6)
    line(`Situation: ${a.situation}`, 10, false, 4)
    line(`Task: ${a.task}`, 10, false, 4)
    line(`Action: ${a.action}`, 10, false, 4)
    line(`Result: ${a.result}`, 10, false, 10)
  })

  pdf.save(`${fileBase(title)}.pdf`)
}

/** One STAR answer as plain text, for per-answer copy. */
export function starToText(a: TranslateResult['starAnswers'][number], n: number): string {
  return `Q${n}. ${a.question}\nSituation: ${a.situation}\nTask: ${a.task}\nAction: ${a.action}\nResult: ${a.result}`
}
