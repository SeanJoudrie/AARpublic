// In-browser OCR for photographed records. A lot of veterans have a *paper*
// ERB/NCOER and no digital file — this lets them photograph it (or pick an
// image) and get the text out. Tesseract runs entirely on-device and all its
// assets are self-hosted from /public/tesseract (no CDN), so it works offline
// and the user's image never leaves the browser. Dynamically imported so the
// engine stays out of the initial bundle.

const BASE = import.meta.env.BASE_URL // respects Vite `base` for subpath deploys
const ASSETS = `${BASE}tesseract/`

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name)
}

/**
 * Recognize text in an image file. `onProgress` reports 0..1 during the
 * recognition phase so the UI can show a real progress bar.
 */
export async function runOcr(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default
  const { data } = await Tesseract.recognize(file, 'eng', {
    workerPath: `${ASSETS}worker.min.js`,
    corePath: ASSETS,
    langPath: ASSETS,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  return (data.text ?? '').replace(/\n{3,}/g, '\n\n').trim()
}
