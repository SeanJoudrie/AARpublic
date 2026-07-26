import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Social scrapers (LinkedIn, Slack, iMessage) want an ABSOLUTE og:image URL.
  // The host isn't decided yet, so set VITE_SITE_URL (e.g. https://aar.example.com)
  // before the production build and the tags become absolute. Left unset they
  // fall back to page-relative paths — fine locally, and still resolved by most
  // scrapers, just not all.
  const site = (loadEnv(mode, process.cwd(), '').VITE_SITE_URL || '').replace(/\/+$/, '')

  return {
    // Relative base so the build works both at a domain root AND under a
    // subpath like seanjoudrie.github.io/AARpublic/. Everything that builds a
    // URL at runtime (the OCR assets in src/lib/ocr.ts) goes through
    // import.meta.env.BASE_URL, so it follows this automatically.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'aar-site-url',
        transformIndexHtml: (html: string) =>
          html.replaceAll('__SITE_URL__/', site ? `${site}/` : './'),
      },
    ],
  }
})
