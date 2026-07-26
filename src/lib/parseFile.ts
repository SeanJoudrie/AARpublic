// Client-side résumé ingestion. Turns an uploaded PDF or DOCX into plain text
// so the user never has to hand-paste their record. Everything runs in the
// browser — the file is never uploaded anywhere. The heavy parsers (pdf.js,
// mammoth) are dynamically imported so they stay out of the initial bundle and
// only download when someone actually uploads a file.

export class UnsupportedFileError extends Error {}

/** Extract plain text from a PDF or DOCX File. Throws on anything else. */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractPdf(file)
  if (name.endsWith('.docx')) return extractDocx(file)
  if (name.endsWith('.txt')) return file.text()
  throw new UnsupportedFileError('Upload a PDF, DOCX, or TXT file.')
}

async function extractPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  const { default: PdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker as string

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) pages.push(text)
  }
  return pages.join('\n\n')
}

async function extractDocx(file: File): Promise<string> {
  // @ts-expect-error — the browser entry ships no bundled types.
  const mammoth = (await import('mammoth/mammoth.browser')).default
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  return (value as string).trim()
}
