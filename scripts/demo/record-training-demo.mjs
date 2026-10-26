// Records the clinical-training demo end to end against the LOCAL stack
// (frontend :3000, backend :4000 with a working judge model).
//
//   node scripts/demo/record-training-demo.mjs <outDir> [--no-captions]
//
// Captures Chrome screencast frames with their real timestamps and encodes
// them with ffmpeg (must be on PATH) into <outDir>/clinical-training-demo.mp4
// at 1920x1080. A fake cursor + click ripple is injected because headless
// Chrome has none.
import { chromium } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve(process.argv[2] ?? 'demo-out')
const CAPTIONS = !process.argv.includes('--no-captions')
// --faculty-only re-records just the faculty section, for splicing onto an existing take
const FACULTY_ONLY = process.argv.includes('--faculty-only')
const NAME = (CAPTIONS ? 'clinical-training-demo' : 'clinical-training-demo-no-captions') + (FACULTY_ONLY ? '-faculty' : '')
const BASE = 'http://localhost:3000'
const FRAMES = path.join(OUT, `${NAME}-frames`)
fs.rmSync(FRAMES, { recursive: true, force: true })
fs.mkdirSync(FRAMES, { recursive: true })

const OVERLAY = () => {
  const install = () => {
    if (document.getElementById('__demo_cursor')) return
    const style = document.createElement('style')
    style.textContent = `
      #__demo_cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .05s}
      .__demo_ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(13,148,136,.35);z-index:2147483646;pointer-events:none;animation:__r .55s ease-out forwards}
      @keyframes __r{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
      #__demo_caption{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;
        background:rgba(15,23,42,.88);color:#fff;font:600 17px/1.35 system-ui,'Segoe UI',sans-serif;padding:11px 22px;border-radius:999px;
        box-shadow:0 8px 30px rgba(0,0,0,.25);transition:opacity .35s;opacity:0;max-width:80vw;text-align:center}
      #__demo_caption b{color:#5eead4;font-weight:700;margin-right:8px}`
    document.documentElement.appendChild(style)
    const c = document.createElement('div')
    c.id = '__demo_cursor'
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.5-3.5 6.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    document.documentElement.appendChild(c)
    const cap = document.createElement('div')
    cap.id = '__demo_caption'
    document.documentElement.appendChild(cap)
    const pos = window.__demo_pos || { x: -50, y: -50 }
    c.style.left = pos.x + 'px'; c.style.top = pos.y + 'px'
    window.addEventListener('mousemove', (e) => { window.__demo_pos = { x: e.clientX, y: e.clientY }; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div'); r.className = '__demo_ripple'
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600)
    }, true)
    window.__caption = (html) => {
      const el = document.getElementById('__demo_caption')
      if (!html) { el.style.opacity = '0'; return }
      el.innerHTML = html; el.style.opacity = '1'
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install)
  else install()
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 })
await ctx.addInitScript(OVERLAY)
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

// ── screencast capture ──────────────────────────────────────────────────────
const cdp = await ctx.newCDPSession(page)
const frames = []
let writing = Promise.resolve()
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = path.join(FRAMES, `${String(frames.length).padStart(6, '0')}.jpg`)
  frames.push({ file, t: metadata.timestamp })
  writing = writing.then(() => fs.promises.writeFile(file, Buffer.from(data, 'base64')))
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })

// ── helpers ─────────────────────────────────────────────────────────────────
const wait = (ms) => page.waitForTimeout(ms)
const caption = async (step, text) => {
  if (!CAPTIONS) return
  await page.evaluate(([s, t]) => window.__caption?.(t ? (s ? `<b>${s}</b>${t}` : t) : ''), [step, text]).catch(() => {})
}
const reveal = async (loc, block = 'center') => {
  await loc.evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block)
  await wait(700)
}
const moveTo = async (loc, { reveal: doReveal = true } = {}) => {
  if (doReveal) await reveal(loc)
  const box = await loc.boundingBox()
  if (!box) throw new Error('element not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 })
  await wait(180)
  return box
}
const click = async (loc, opts) => {
  await moveTo(loc, opts)
  await page.mouse.down(); await wait(60); await page.mouse.up()
  await wait(350)
}
const type = async (loc, text, delay = 38) => {
  await click(loc)
  await page.keyboard.type(text, { delay })
  await wait(250)
}
const pick = async (testId, query, option) => {
  const input = page.getByTestId(testId)
  await type(input, query, 60)
  const opt = input.locator('xpath=..').locator('ul button', { hasText: option }).first()
  await opt.waitFor({ timeout: 10000 })
  await wait(400)
  await click(opt, { reveal: false })
}
const slide = async (loc, value) => {
  const box = await moveTo(loc)
  await page.mouse.move(box.x + (box.width * value) / 100, box.y + box.height / 2, { steps: 18 })
  await page.mouse.down(); await page.mouse.up()
  await wait(300)
}
const scrollMain = async (px, ms = 1400) => {
  await page.evaluate(([dy, dur]) => new Promise((res) => {
    const el = document.querySelector('main') ?? document.scrollingElement
    const start = el.scrollTop, t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      el.scrollTop = start + dy * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
      k < 1 ? requestAnimationFrame(step) : res()
    }
    requestAnimationFrame(step)
  }), [px, ms])
  await wait(300)
}
const login = async (email, password, step) => {
  await page.goto(`${BASE}/login`)
  await page.locator('input[type="email"]').first().waitFor()
  await wait(600)
  await caption(step, `Sign in as ${email.startsWith('trainee') ? 'a trainee doctor' : 'faculty'}`)
  await type(page.locator('input[type="email"]').first(), email, 30)
  await type(page.locator('input[type="password"]').first(), password, 30)
  await click(page.locator('button[type="submit"]').first())
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
}

// ── the demo ────────────────────────────────────────────────────────────────
const t0 = Date.now()
if (!FACULTY_ONLY) {
await page.goto(`${BASE}/login`)
await page.mouse.move(760, 430)
await wait(1200)

await login('trainee@example.com', 'Trainee@12345', '1')
await wait(800)
await click(page.getByTestId('nav-training'))
await page.waitForSelector('[data-testid^="case-card-"]', { timeout: 60000 })
await caption('1', 'Clinical Training: real, de-identified NAS teleconsultations as practice cases')
await wait(3500)
await moveTo(page.getByTestId('case-card-throbbing-headache-heel-pain'))
await wait(900)
await moveTo(page.getByTestId('case-card-itchy-hands-runny-nose'))
await wait(900)
await caption('2', 'Open a case: a 4-year-old girl with cough and cold')
await click(page.getByTestId('case-card-cough-cold-toddler').getByRole('link', { name: /start case/i }))
await page.getByTestId('impression-panel').waitFor({ timeout: 60000 })
await wait(1500)

// Stage 1: presenting complaint
await caption('3', 'The case unfolds stage by stage. Commit to a working diagnosis before seeing more')
await moveTo(page.getByTestId('stage-complaint'))
await wait(2500)
await pick('impression-input', 'Upper resp', 'Upper Respiratory Tract Infection (URTI)')
await pick('impression-input', 'Allergic', 'Allergic Rhinitis')
await slide(page.getByTestId('confidence'), 55)
await wait(600)
await click(page.getByTestId('commit-impression'))

// Stage 2: history
await page.getByTestId('stage-history').waitFor()
await caption('3', 'History revealed: she denies runny nose and itching, so allergic rhinitis drops off')
await wait(2600)
await click(page.getByTestId('impression-panel').getByRole('button', { name: 'Remove' }).nth(1))
await slide(page.getByTestId('confidence'), 65)
await click(page.getByTestId('commit-impression'))

// Stage 3: vitals (the trainee overlooks the weight)
await page.getByTestId('stage-vitals').waitFor()
await caption('3', 'Vitals: afebrile, SpO2 100%. Our trainee is focused on the cough...')
await wait(3200)
await slide(page.getByTestId('confidence'), 75)
await click(page.getByTestId('commit-impression'))

// Stage 4: examination
await page.getByTestId('stage-exam').waitFor()
await wait(2200)
await caption('3', 'Each commitment builds a reasoning trail the tutor will review later')
await moveTo(page.getByText('Your reasoning trail'))
await wait(1800)
await click(page.getByTestId('commit-impression'))

// Assessment
await page.getByTestId('dx-panel').waitFor()
await caption('4', 'Write the assessment: explain the diagnosis and pin the supporting findings from the note')
await wait(1200)
await type(page.getByTestId('dx-reasoning-0'), 'Short history of dry night cough with cold and sneezing. Afebrile, SpO2 100%, no wheeze or breathlessness, so most likely a viral URTI.', 22)
for (const f of ['Type of cough - Dry.', 'Timing - Night.', 'Temperature: 36.3 °C', 'SpO2: 100 %']) {
  await click(page.locator(`[data-finding="${f}"]`).first())
  await wait(250)
}
await wait(900)

await caption('5', 'Treatment plan: medicines from the formulary, advice, and safety-netting')
await pick('med-drug-0', 'Cetiri', 'Cetirizine 10 mg Oral Tablet')
await type(page.getByTestId('med-dose-0'), '1 tablet', 45)
await page.getByTestId('med-freq-0').selectOption('Once daily')
await type(page.getByTestId('med-dur-0'), '5 days', 45)
await click(page.getByTestId('med-add'))
await pick('med-drug-1', 'Paracetamol 250', 'Paracetamol 250 mg/5ml Oral Suspension')
await type(page.getByTestId('med-dose-1'), '5 ml', 45)
await moveTo(page.getByTestId('med-freq-1'))
await page.getByTestId('med-freq-1').selectOption('Three times daily')
await type(page.getByTestId('med-dur-1'), '3 days', 45)
await pick('advice-input', 'Steam', 'Steam inhalation')
await pick('advice-input', 'DRINK LOTS', 'DRINK LOTS OF WATER')
await type(page.getByTestId('safety-net'), 'Return if fast breathing, fever or not feeding', 30)
await wait(800)

await caption('6', 'Submit: an LLM judge reviews diagnosis, reasoning, treatment and safety')
await click(page.getByTestId('submit-attempt'))
await page.getByTestId('judging').waitFor()
await page.getByTestId('score-hero').waitFor({ timeout: 240000 })
await caption('6', 'Instant, case-specific feedback. No answer key needed, the judge reads the note itself')
await wait(4500)

await caption('7', 'It catches what was missed: the girl is 10.5 kg at age 4, severely underweight')
await moveTo(page.getByTestId('missed'))
await wait(3500)
await click(page.getByTestId('show-clues'))
await wait(1200)
await reveal(page.locator('[data-testid="missed"] .bg-yellow-100').first())
await wait(3500)
await click(page.getByTestId('show-clues'))

await caption('8', 'A Socratic tutor: answer its question and it coaches you through it')
await reveal(page.getByTestId('tutor'), 'start')
await wait(2500)
await type(page.getByTestId('tutor-input'), 'Her weight is far below normal for a 4-year-old, so she is underweight. I should have plotted her on the growth chart.', 24)
await click(page.getByTestId('tutor-send'))
await page.getByTestId('turn-tutor').last().waitFor({ timeout: 120000 })
await wait(800)
await reveal(page.getByTestId('turn-tutor').last(), 'center')
await wait(7000)

await caption('9', 'Reasoning review: how the impression evolved, and whether pinned evidence holds up')
await reveal(page.getByTestId('reasoning'), 'start')
await wait(5000)
await caption('10', 'Treatment review: unsafe doses flagged, compared with the treating doctor\'s actual plan')
await reveal(page.getByTestId('tx-review'), 'start')
await wait(6000)
await caption('11', 'Peer comparison and teaching points: how peers approached the same case')
await reveal(page.getByTestId('peers'), 'start')
await wait(5500)
await scrollMain(400)
await wait(3000)
await caption('', '')

}

// Faculty view
await page.evaluate(() => { try { localStorage.clear() } catch {} }) // about:blank in --faculty-only
await login('admin@example.com', 'Admin@123456', '12')
await wait(600)
await click(page.getByTestId('nav-cohort'))
await page.getByTestId('heatmap').waitFor({ timeout: 60000 })
await caption('12', 'Faculty dashboard: every trainee, every case, scored on the same rubric')
await wait(4500)
await moveTo(page.getByTestId('heatmap').getByText('Dr. Priya Nair'))
await wait(2000)
await caption('12', 'See which diagnoses the batch misses most')
await moveTo(page.getByTestId('cohort-missed'))
await wait(4000)
await scrollMain(700)
await wait(500) // ends on the dashboard; no closing title card, the product name is added in the edit

// ── finish ──────────────────────────────────────────────────────────────────
await cdp.send('Page.stopScreencast')
await writing
await browser.close()
console.log(`captured ${frames.length} frames in ${Math.round((Date.now() - t0) / 1000)}s`)

const list = frames.map((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 1.5
  return `file '${f.file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`
})
list.push(`file '${frames.at(-1).file.replace(/\\/g, '/')}'`)
const concat = path.join(OUT, `${NAME}-frames.txt`)
fs.writeFileSync(concat, list.join('\n'))
const mp4 = path.join(OUT, `${NAME}.mp4`)
const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concat,
  '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart', mp4], { stdio: 'inherit' })
if (ff.status !== 0) process.exit(ff.status ?? 1)
fs.rmSync(FRAMES, { recursive: true, force: true })
fs.rmSync(concat, { force: true })
console.log('wrote', mp4)
