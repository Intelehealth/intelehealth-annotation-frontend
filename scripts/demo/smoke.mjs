// Screenshots each clinical-training screen for a quick visual check.
//   node scripts/demo/smoke.mjs <outDir> [attemptId]
import { chromium } from '@playwright/test'

const OUT = process.argv[2] ?? 'demo-out'
const ATTEMPT = process.argv[3]
const BASE = 'http://localhost:3000'

async function login(page, email, password) {
  await page.goto(`${BASE}/login`)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

await login(page, 'trainee@example.com', 'Trainee@12345')
await page.goto(`${BASE}/training`)
await page.waitForSelector('[data-testid^="case-card-"]', { timeout: 60000 })
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/1-library.png`, fullPage: true })

await page.goto(`${BASE}/training/cough-cold-toddler`)
await page.waitForSelector('[data-testid="impression-panel"]', { timeout: 60000 })
await page.screenshot({ path: `${OUT}/2-case-stage1.png` })

if (ATTEMPT) {
  await page.goto(`${BASE}/training/attempts/${ATTEMPT}`)
  await page.waitForSelector('[data-testid="score-hero"]', { timeout: 60000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/3-review.png`, fullPage: true })
}

await login(page, 'admin@example.com', 'Admin@123456')
await page.goto(`${BASE}/training/cohort`)
await page.waitForSelector('[data-testid="heatmap"]', { timeout: 60000 })
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/4-cohort.png`, fullPage: true })

await browser.close()
console.log('screenshots in', OUT)
