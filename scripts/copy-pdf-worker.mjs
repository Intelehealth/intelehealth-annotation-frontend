// Copies pdf.js's worker out of node_modules into public/ so it is served
// same-origin instead of hotlinked from a CDN. Runs on prebuild/predev, so the
// worker is always the exact version of the installed pdfjs-dist — a mismatch
// between the API and the worker makes pdf.js fail at runtime.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const src = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs')
const dest = join(process.cwd(), 'public', 'pdf.worker.min.mjs')

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log(`[pdf-worker] ${src} -> ${dest}`)
