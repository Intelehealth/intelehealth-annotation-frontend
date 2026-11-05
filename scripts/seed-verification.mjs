#!/usr/bin/env node
// LOCAL ONLY. Sets up a "Consensus Verification" workspace from an exported
// final-consensus CSV so the verification flow can be tried end to end:
//   - two reviewer accounts (stand-ins for the Intelehealth doctors)
//   - the CSV uploaded as a NEW dataset (never the source dataset), consensus
//     columns mapped as answer fields so they open prefilled, plus Verdict /
//     Sections needing correction / Reviewer comment
//   - each reviewer gets their own copy and "reviews" some rows with
//     SIMULATED, deterministic edits (accept, correct, fill PENDING, dispute)
//   - consensus generated and a collaborative session opened for both
//
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/seed-verification.mjs "/path/to/consensus-final.csv"

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const API = process.env.API ?? 'http://localhost:4000'
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD }
const PASSWORD = 'Password123!'
const CSV_PATH = process.argv[2]
if (!CSV_PATH) { console.error('usage: seed-verification.mjs <consensus.csv>'); process.exit(1) }
if (!ADMIN.password) { console.error('set ADMIN_PASSWORD (and ADMIN_EMAIL) for a local admin'); process.exit(1) }
if (/run\.app|https:/.test(API)) { console.error('Refusing to seed a non-local API:', API); process.exit(1) }

const log = (...a) => console.log('[verify-seed]', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const id = (o) => o?._id ?? o?.id

async function call(method, path, { token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !form) headers['Content-Type'] = 'application/json'
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) })
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (res.status === 429 && attempt < 8) { await sleep(attempt * 5000); continue }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`.slice(0, 500))
    return data
  }
}

// Minimal RFC-4180 parser (quoted fields, embedded commas/newlines, BOM).
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''))
  return { header, rows: body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))) }
}

async function ensureUser(admin, u) {
  try { await call('POST', '/users', { token: admin, body: { email: u.email, role: 'ANNOTATOR', firstName: u.first, lastName: u.last } }) } catch (e) { if (!/exist|409/i.test(e.message)) throw e }
  let reg
  try { reg = await call('POST', '/auth/register', { body: { email: u.email, password: PASSWORD, firstName: u.first, lastName: u.last } }) } catch (e) {
    if (!/exist|409|already/i.test(e.message)) throw e
    reg = await call('POST', '/auth/login', { body: { email: u.email, password: PASSWORD } })
  }
  const userId = id(reg.user)
  try { await call('PATCH', `/users/${userId}/status`, { token: admin, body: { status: 'ACTIVE' } }) } catch { /* already active */ }
  return { ...u, token: reg.accessToken, userId }
}

// ---------------------------------------------------------------------------
const REVIEWERS = [
  { key: 'N', email: 'dr.nilofer.test@example.com', first: 'Nilofer', last: '(test)' },
  { key: 'R', email: 'dr.raghavendra.test@example.com', first: 'Raghavendra', last: '(test)' },
]
const WORKSPACE = { name: 'Consensus Verification', description: 'Intelehealth doctors verify the Indika AI final consensus. Each reviewer works on their own copy.', domain: 'Healthcare', sharingMode: 'CLONE' }

// The consensus answer columns start here in the export; everything before is visit context.
const FIRST_ANSWER_COL = 'Clinical data completeness of the history given'
const SKIP_COLS = new Set(['Pending questions'])
const SELECTS = {
  'Clinical data completeness of the history given': null, // options derived from data
  'Diagnosis 1.Type': ['Provisonal', 'Confirmed', 'PENDING'],
  'Diagnosis 2.Type': ['Provisonal', 'Confirmed', 'PENDING'],
  'Diagnosis 3.Type': ['Provisonal', 'Confirmed', 'PENDING'],
}
const REVIEW_FIELDS = [
  { name: 'Verdict', type: 'select', options: ['Correct', 'Correct with edits', 'Incorrect'], required: true },
  { name: 'Sections needing correction', type: 'multiselect', options: ['Diagnosis', 'Treatment', 'Tests', 'Advice', 'Image findings', 'Data completeness'] },
  { name: 'Reviewer comment', type: 'textarea' },
]

function buildSchema(header, rows) {
  const start = header.indexOf(FIRST_ANSWER_COL)
  const context = header.slice(0, start)
  const answers = header.slice(start).filter((c) => !SKIP_COLS.has(c))
  const optionsFor = (c) => SELECTS[c] ?? [...new Set(rows.map((r) => r[c]).filter(Boolean))]
  return {
    answers,
    schema: {
      annotationFields: [
        // 'Image' holds comma-separated OpenMRS URLs; typed as image so the workbench shows thumbnails.
        ...context.map((c) => ({ csvColumnName: c, fieldName: c, fieldType: c === 'Image' ? 'image' : 'text', isRequired: false, isAnnotationField: false, isPrimaryKey: c === 'Visit_id' })),
        ...answers.map((c) => (c in SELECTS
          ? { csvColumnName: c, fieldName: c, fieldType: 'text', columnType: 'select', options: optionsFor(c), isRequired: false, isAnnotationField: true }
          : { csvColumnName: c, fieldName: c, fieldType: 'text', columnType: 'textarea', isRequired: false, isAnnotationField: true })),
        ...REVIEW_FIELDS.map((f) => ({
          csvColumnName: f.name, fieldName: f.name, fieldType: 'text', columnType: f.type, options: f.options, isRequired: !!f.required,
          isAnnotationField: true, isNewColumn: true, newColumnId: `${f.name.toLowerCase().replace(/\W+/g, '_')}_col`,
        })),
      ],
      annotationLabels: [],
      newColumns: REVIEW_FIELDS.map((f) => ({ id: `${f.name.toLowerCase().replace(/\W+/g, '_')}_col`, columnName: f.name, columnType: f.type, options: f.options, isRequired: !!f.required })),
      fieldGroups: [],
    },
  }
}

// SIMULATED review: deterministic so the analytics/session can be checked by hand.
//   both reviewers: rows 1-20 (R stops at 15) reviewed
//   i % 4 === 1  -> both upgrade Diagnosis 1.Type Provisonal→Confirmed (agreed correction)
//   i % 5 === 3  -> N and R write DIFFERENT Diagnosis 1 values (dispute)
//   i % 6 === 2  -> N fills a PENDING in Medical Tests.Diagnosis 1 Tests (PENDING filled, not a correction)
function review(key, i, row, answers) {
  // the importer drops tabs; send what the workbench would prefill
  const out = Object.fromEntries(answers.map((c) => [c, String(row[c] ?? '').replace(/\t/g, '')]))
  const sections = []
  if (i % 4 === 1 && row['Diagnosis 1.Type'] === 'Provisonal') { out['Diagnosis 1.Type'] = 'Confirmed'; sections.push('Diagnosis') }
  if (i % 5 === 3) { out['Diagnosis 1.Diagnostic Array'] = key === 'N' ? `${row['Diagnosis 1.Diagnostic Array']} (secondary infection)` : 'Contact dermatitis'; sections.push('Diagnosis') }
  if (key === 'N' && i % 6 === 2 && /PENDING/i.test(row['Medical Tests.Diagnosis 1 Tests'])) out['Medical Tests.Diagnosis 1 Tests'] = 'CBC'
  out['Verdict'] = sections.length ? 'Correct with edits' : 'Correct'
  out['Sections needing correction'] = [...new Set(sections)].join(',')
  out['Reviewer comment'] = sections.length ? 'Simulated test review' : ''
  return out
}

async function simulateReviews(people, datasetId, rows, answers) {
  for (const p of people) {
    const task = (await call('GET', '/datasets/my-tasks', { token: p.token })).find((t) => String(t.cloneParentId) === String(datasetId))
    const cloneId = id(task.dataset) ?? task.cloneDatasetId
    const n = p.key === 'N' ? 20 : 15
    for (let i = 0; i < n; i++) {
      await call('PATCH', `/dataset-merged-rows/dataset/${cloneId}/row/${i + 1}`, { token: p.token, body: { data: review(p.key, i, rows[i], answers) } })
      await call('PATCH', '/dataset-merged-rows/mark-completed', { token: p.token, body: { datasetId: cloneId, rowIndex: i + 1 } })
    }
    await call('PATCH', `/field-selection/dataset/${cloneId}/progress`, { token: p.token, body: { lastViewedRow: n, completedRows: n } })
    log(`  ${p.first}: reviewed ${n} rows (simulated)`)
  }
}

async function main() {
  const { header, rows } = parseCsv(readFileSync(CSV_PATH, 'utf8'))
  log(`csv: ${rows.length} rows, ${header.length} columns`)
  const adminLogin = await call('POST', '/auth/login', { body: ADMIN })
  const admin = adminLogin.accessToken
  const people = []
  for (const r of REVIEWERS) { people.push(await ensureUser(admin, r)); await sleep(1500) }
  log(`reviewers: ${people.map((p) => p.email).join(', ')} / ${PASSWORD}`)

  const ws = (await call('GET', '/workspaces', { token: admin })).find((w) => w.name === WORKSPACE.name)
    ?? await call('POST', '/workspaces', { token: admin, body: WORKSPACE })
  for (const p of people) { try { await call('POST', `/workspaces/${id(ws)}/members`, { token: admin, body: { userId: p.userId } }) } catch (e) { if (!/already/i.test(e.message)) throw e } }
  log(`workspace "${ws.name}" ${id(ws)}`)

  const name = `Indika final consensus — verification (${basename(CSV_PATH)})`
  const all = await call('GET', '/datasets', { token: admin })
  const existing = (Array.isArray(all) ? all : all?.data ?? []).find((d) => d.name === name && !d.isClone)
  if (existing) {
    if (!process.argv.includes('--rereview')) { log(`dataset "${name}" already exists — pass --rereview to redo the simulated reviews`); return }
    await simulateReviews(people, id(existing), rows, buildSchema(header, rows).answers)
    return
  }
  const ds = await call('POST', '/datasets', { token: admin, body: { name, description: `Source: Indika AI consensus export ${basename(CSV_PATH)}, uploaded ${new Date().toISOString().slice(0, 10)}. Do not edit directly — this is the verification baseline.`, datasetType: 'text', accessType: 'private' } })
  const datasetId = id(ds)
  const form = new FormData()
  form.append('file', new Blob([readFileSync(CSV_PATH)], { type: 'text/csv' }), basename(CSV_PATH))
  await call('POST', `/csv-processing/upload/${datasetId}`, { token: admin, form })
  const { schema, answers } = buildSchema(header, rows)
  await call('POST', `/field-selection/dataset/${datasetId}`, { token: admin, body: schema })
  await call('POST', `/workspaces/${id(ws)}/datasets`, { token: admin, body: { datasetId } })
  log(`dataset ${datasetId}: ${answers.length} consensus answer fields + ${REVIEW_FIELDS.length} review fields`)

  await call('PATCH', `/datasets/${datasetId}`, { token: admin, body: { verificationMode: true } })
  // The answer editor uses the source annotation form (dropdowns, drug list, repeat groups).
  if (process.env.SOURCE_DATASET_ID) await call('POST', `/datasets/${datasetId}/verification-form`, { token: admin, body: { sourceDatasetId: process.env.SOURCE_DATASET_ID } })
  // Dataset reviewers may record final answers on the consensus page.
  for (const p of people) await call('POST', `/datasets/${datasetId}/reviewers/${p.userId}`, { token: admin })
  await call('POST', `/datasets/${datasetId}/clone-assign`, { token: admin, body: { annotatorUserIds: people.map((p) => p.userId) } })
  await simulateReviews(people, datasetId, rows, answers)


  try {
    await call('POST', `/consensus/${datasetId}/generate`, { token: admin, body: {} })
    const snap = await call('POST', `/consensus/${datasetId}/snapshot`, { token: admin, body: {} })
    const session = await call('POST', `/consensus/${datasetId}/review-session`, { token: admin, body: { snapshotId: id(snap), title: `${name} - Verification review`, participantIds: people.map((p) => p.userId), fromTiesOnly: false } })
    log(`session: http://localhost:3000/dataset/${datasetId}/review-session/${session.shareCode}`)
  } catch (e) { log(`(session not created: ${e.message.slice(0, 200)})`) }
  log(`workspace: http://localhost:3000/workspaces/${id(ws)}`)
}

main().catch((e) => { console.error('[verify-seed] failed:', e.message); process.exit(1) })
