#!/usr/bin/env node
// Seeds a LOCAL backend with realistic data so the dashboard has something to
// show: four annotators and four datasets in different states (complete with
// consensus and conflicts, partially annotated, complete with some conflicts
// resolved, assigned but untouched). Idempotent: datasets that already exist
// by name are skipped. Uses the same HTTP flow as the backend's own
// consensus-v2 e2e spec. Never point this at production.
//
//   node scripts/seed-local.mjs            # API at http://localhost:4000
//   API=http://localhost:4000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-local.mjs

const API = process.env.API ?? 'http://localhost:4000'
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'Admin@123456' }
const ANNOTATOR_PASSWORD = 'Password123!'

if (/run\.app|https:/.test(API)) {
  console.error('Refusing to seed a non-local API:', API)
  process.exit(1)
}

const log = (...a) => console.log('[seed]', ...a)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function call(method, path, { token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !form) headers['Content-Type'] = 'application/json'
  // /auth/* is rate-limited (ThrottlerGuard); back off and retry on 429
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) })
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (res.status === 429 && attempt < 8) { log(`  429 on ${path}, waiting ${attempt * 5}s`); await sleep(attempt * 5000); continue }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`.slice(0, 400))
    return data
  }
}

const id = (o) => o?._id ?? o?.id

// ---------------------------------------------------------------------------
// people
async function ensureAnnotator(admin, a) {
  // invite (admin) then register (self); both tolerate "already exists"
  try { await call('POST', '/users', { token: admin, body: { email: a.email, role: 'ANNOTATOR', firstName: a.first, lastName: a.last } }) } catch (e) { if (!/exist|409/i.test(e.message)) throw e }
  let reg
  try {
    reg = await call('POST', '/auth/register', { body: { email: a.email, password: ANNOTATOR_PASSWORD, firstName: a.first, lastName: a.last } })
  } catch (e) {
    if (!/exist|409|already/i.test(e.message)) throw e
    reg = await call('POST', '/auth/login', { body: { email: a.email, password: ANNOTATOR_PASSWORD } })
  }
  const userId = id(reg.user)
  // invited accounts start INACTIVE until activated; the admin activates them
  try { await call('PATCH', `/users/${userId}/status`, { token: admin, body: { status: 'ACTIVE' } }) } catch (e) { log(`  (activate skipped for ${a.email}: ${e.message.slice(0, 80)})`) }
  return { ...a, token: reg.accessToken, userId }
}

// ---------------------------------------------------------------------------
// schema helpers: the field-selection payload the app's schema editor produces
function field(name, columnType, extra = {}) {
  return {
    csvColumnName: name, fieldName: name, fieldType: 'text', isRequired: false, isAnnotationField: true,
    isNewColumn: true, newColumnId: `${name.toLowerCase()}_col`, columnType, ...extra
  }
}
function column(name, columnType, extra = {}) {
  return { id: `${name.toLowerCase()}_col`, columnName: name, columnType, isRequired: false, ...extra }
}
function schema(sourceColumns, defs) {
  return {
    annotationFields: [
      // the first source column is the row id and must be the single primary key
      ...sourceColumns.map((c, i) => ({ csvColumnName: c, fieldName: c, fieldType: 'text', isRequired: true, isAnnotationField: false, isPrimaryKey: i === 0 })),
      ...defs.map((d) => field(d.name, d.type, d.extra))
    ],
    annotationLabels: [],
    newColumns: defs.map((d) => column(d.name, d.type, d.extra)),
    fieldGroups: []
  }
}

// ---------------------------------------------------------------------------
// datasets
const pick = (arr, i) => arr[i % arr.length]

const DATASETS = [
  {
    name: 'Support tickets — intent & urgency',
    description: 'Customer support messages labelled for intent and urgency. Three annotators, consensus generated.',
    source: ['ticket', 'text'],
    rows: [
      'Cannot log in since the update this morning', 'Refund still not received after 14 days', 'How do I export my data as CSV?',
      'App crashes when uploading a PDF larger than 20MB', 'Please cancel my subscription', 'Feature request: dark mode',
      'Charged twice for the same invoice', 'Password reset email never arrives', 'Is there an API for bulk import?',
      'Annotator cannot see the assigned dataset', 'Consensus statistics page shows an error', 'Thank you, issue resolved'
    ].map((t, i) => [`T-${1001 + i}`, t]),
    fields: [
      { name: 'Intent', type: 'select', extra: { options: ['Bug', 'Billing', 'Question', 'Request', 'Other'] } },
      { name: 'Urgency', type: 'select', extra: { options: ['Low', 'Medium', 'High'] } },
      { name: 'NeedsHuman', type: 'checkbox' },
      { name: 'Confidence', type: 'rating', extra: { maxRating: 5, allowHalf: false } }
    ],
    annotators: [0, 1, 2],
    // truth per row, then per-annotator noise injected below
    truth: (i, text) => ({
      Intent: /refund|charged|subscription|invoice/i.test(text) ? 'Billing' : /crash|cannot|never|error/i.test(text) ? 'Bug' : /how|is there/i.test(text) ? 'Question' : /request/i.test(text) ? 'Request' : 'Other',
      Urgency: /crash|charged|cannot log/i.test(text) ? 'High' : /refund|never|error/i.test(text) ? 'Medium' : 'Low',
      NeedsHuman: /refund|charged|cancel/i.test(text) ? 'true' : 'false',
      Confidence: String(3 + (i % 3))
    }),
    completion: [1, 1, 1],
    consensus: true,
    resolve: 0,
    submit: [0, 1]
  },
  {
    name: 'Contract clauses — risk classification',
    description: 'Clauses from vendor agreements, labelled for risk. Two annotators, in progress.',
    source: ['clause_id', 'text'],
    rows: [
      'Either party may terminate this agreement with 30 days written notice.', 'Vendor shall indemnify Client against all third-party claims without limit.',
      'Liability is capped at fees paid in the preceding twelve months.', 'Client data may be processed in any jurisdiction at Vendor discretion.',
      'This agreement renews automatically for successive one-year terms.', 'Vendor may subcontract obligations without prior consent.',
      'All disputes shall be resolved by binding arbitration in Singapore.', 'Prices may be increased at any time with 15 days notice.',
      'Client retains all intellectual property in its data.', 'Vendor shall maintain ISO 27001 certification for the term.'
    ].map((t, i) => [`C-${i + 1}`, t]),
    fields: [
      { name: 'Risk', type: 'select', extra: { options: ['Low', 'Medium', 'High'] } },
      { name: 'Category', type: 'select', extra: { options: ['Termination', 'Liability', 'Data', 'Commercial', 'IP', 'Security'] } },
      { name: 'Flags', type: 'multiselect', extra: { options: ['Unilateral', 'Uncapped', 'Auto-renew', 'Jurisdiction'] } }
    ],
    annotators: [1, 3],
    truth: (i, text) => ({
      Risk: /without limit|any jurisdiction|without prior consent|any time/i.test(text) ? 'High' : /capped|automatically|arbitration/i.test(text) ? 'Medium' : 'Low',
      Category: /terminate/i.test(text) ? 'Termination' : /indemnify|liability/i.test(text) ? 'Liability' : /data/i.test(text) ? 'Data' : /price|renews|subcontract/i.test(text) ? 'Commercial' : /intellectual/i.test(text) ? 'IP' : 'Security',
      Flags: [/discretion|any time|without prior/i.test(text) && 'Unilateral', /without limit/i.test(text) && 'Uncapped', /automatically/i.test(text) && 'Auto-renew', /singapore|jurisdiction/i.test(text) && 'Jurisdiction'].filter(Boolean).join(',')
    }),
    completion: [0.6, 0.3],
    consensus: false,
    resolve: 0,
    submit: []
  },
  {
    name: 'Product reviews — sentiment',
    description: 'E-commerce reviews labelled for sentiment and aspect. Three annotators, consensus generated, review in progress.',
    source: ['review_id', 'text'],
    rows: [
      'Battery lasts two days, screen is gorgeous.', 'Stopped charging after a week. Returning it.', 'Decent for the price, nothing special.',
      'Customer service was rude and unhelpful.', 'Arrived early and well packaged.', 'The strap broke on day three.',
      'Exactly as described. Would buy again.', 'Too heavy to wear all day.', 'Setup took an hour and the app kept crashing.',
      'Great sound, weak microphone.', 'Five stars, no complaints.', 'Colour is nothing like the photos.',
      'Works fine. Instructions were confusing.', 'Best purchase this year.', 'Overpriced for what it does.'
    ].map((t, i) => [`R-${2000 + i}`, t]),
    fields: [
      { name: 'Sentiment', type: 'select', extra: { options: ['Positive', 'Neutral', 'Negative'] } },
      { name: 'Aspect', type: 'select', extra: { options: ['Quality', 'Price', 'Service', 'Delivery', 'Usability'] } },
      { name: 'Verified', type: 'checkbox' },
      { name: 'Stars', type: 'rating', extra: { maxRating: 5, allowHalf: false } }
    ],
    annotators: [0, 2, 3],
    truth: (i, text) => ({
      Sentiment: /gorgeous|early|exactly|great|five stars|best|fine/i.test(text) ? 'Positive' : /decent|nothing special|confusing/i.test(text) ? 'Neutral' : 'Negative',
      Aspect: /price|overpriced/i.test(text) ? 'Price' : /service|rude/i.test(text) ? 'Service' : /arrived|packaged/i.test(text) ? 'Delivery' : /setup|app|instructions|heavy/i.test(text) ? 'Usability' : 'Quality',
      Verified: i % 4 === 0 ? 'false' : 'true',
      Stars: /gorgeous|five|best|exactly/i.test(text) ? '5' : /decent|fine|great/i.test(text) ? '3' : '1'
    }),
    completion: [1, 1, 1],
    consensus: true,
    resolve: 2,
    submit: [0, 1, 2]
  },
  {
    name: 'Vehicle damage reports',
    description: 'Free-text incident descriptions, to be labelled for damage type and severity. Assigned, not started.',
    source: ['report_id', 'text'],
    rows: [
      'Rear bumper dented in parking lot, no paint transfer.', 'Windscreen cracked by stone on highway.', 'Front left wheel arch scraped along a pillar.',
      'Hail damage across bonnet and roof.', 'Side mirror sheared off by passing van.', 'Minor scratch on driver door, key marks.',
      'Water ingress after flooding, interior soaked.', 'Headlight assembly shattered in low-speed collision.'
    ].map((t, i) => [`V-${300 + i}`, t]),
    fields: [
      { name: 'DamageType', type: 'select', extra: { options: ['Body', 'Glass', 'Mechanical', 'Interior', 'Other'] } },
      { name: 'Severity', type: 'select', extra: { options: ['Minor', 'Moderate', 'Severe'] } },
      { name: 'Driveable', type: 'checkbox' }
    ],
    annotators: [0, 1, 2, 3],
    truth: () => ({}),
    completion: [0, 0, 0, 0],
    consensus: false,
    resolve: 0,
    submit: []
  }
]

const PEOPLE = [
  { email: 'asha@example.com', first: 'Asha', last: 'Nair' },
  { email: 'rahul@example.com', first: 'Rahul', last: 'Mehta' },
  { email: 'meera@example.com', first: 'Meera', last: 'Iyer' },
  { email: 'kabir@example.com', first: 'Kabir', last: 'Shah' }
]

// deterministic disagreement: annotator k flips the first select on rows where (i + k) % 5 === 0
function answerFor(ds, i, text, k) {
  const t = ds.truth(i, text)
  const out = { ...t }
  const firstSelect = ds.fields.find((f) => f.type === 'select')
  if (firstSelect && (i + k) % 5 === 0) {
    const opts = firstSelect.extra.options
    out[firstSelect.name] = pick(opts, opts.indexOf(t[firstSelect.name]) + 1 + k)
  }
  const rating = ds.fields.find((f) => f.type === 'rating')
  if (rating && (i + k) % 7 === 0 && t[rating.name]) out[rating.name] = String(Math.max(1, Number(t[rating.name]) - 1))
  return out
}

async function seedDataset(admin, adminUserId, people, ds) {
  const existingList = await call('GET', '/datasets', { token: admin })
  const existing = (Array.isArray(existingList) ? existingList : existingList?.data ?? []).find((d) => d.name === ds.name && !d.isClone)
  let datasetId
  if (existing) {
    datasetId = id(existing)
    log(`exists: ${ds.name} -> ${datasetId} (annotation skipped, consensus step still runs)`)
  } else {
  const created = await call('POST', '/datasets', { token: admin, body: { name: ds.name, description: ds.description, datasetType: 'text', accessType: 'private' } })
  datasetId = id(created)
  log(`dataset ${ds.name} -> ${datasetId}`)

  const csv = [ds.source.join(','), ...ds.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
  const form = new FormData()
  form.append('file', new Blob([csv], { type: 'text/csv' }), `${ds.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.csv`)
  await call('POST', `/csv-processing/upload/${datasetId}`, { token: admin, form })
  await call('POST', `/field-selection/dataset/${datasetId}`, { token: admin, body: schema(ds.source, ds.fields) })

  const team = ds.annotators.map((k) => people[k])
  const assign = await call('POST', `/datasets/${datasetId}/clone-assign`, { token: admin, body: { annotatorUserIds: team.map((p) => p.userId) } })
  log(`  assigned to ${team.map((p) => p.first).join(', ')} (${assign.tasksCreated ?? '?'} tasks)`)

  // each annotator labels their share of rows on their own clone
  const cloneOf = {}
  for (const [j, p] of team.entries()) {
    const tasks = await call('GET', '/datasets/my-tasks', { token: p.token })
    const task = tasks.find((t) => String(t.cloneParentId) === String(datasetId))
    if (!task) { log(`  ! no task for ${p.first}`); continue }
    const cloneId = id(task.dataset) ?? task.cloneDatasetId
    cloneOf[p.userId] = { cloneId, task }
    const n = Math.round(ds.rows.length * ds.completion[j])
    for (let i = 0; i < n; i++) {
      const rowIndex = i + 1
      const data = { ...Object.fromEntries(ds.source.map((c, ci) => [c, ds.rows[i][ci]])), ...answerFor(ds, i, ds.rows[i][1], ds.annotators[j]) }
      await call('PATCH', `/dataset-merged-rows/dataset/${cloneId}/row/${rowIndex}`, { token: p.token, body: { data } })
      await call('PATCH', '/dataset-merged-rows/mark-completed', { token: p.token, body: { datasetId: cloneId, rowIndex } })
    }
    if (n > 0) await call('PATCH', `/field-selection/dataset/${cloneId}/progress`, { token: p.token, body: { lastViewedRow: n, completedRows: n } })
    log(`  ${p.first}: ${n}/${ds.rows.length} rows`)
  }

  // some annotators submit their clone for review (feeds the review queue)
  for (const j of ds.submit) {
    const p = team[j]
    const entry = cloneOf[p.userId]
    const assignmentId = entry?.task?.assignmentId ?? entry?.task?._id ?? entry?.task?.id
    if (!assignmentId) continue
    try {
      await call('PATCH', `/assignments/${assignmentId}/status`, { token: p.token, body: { status: 'SUBMITTED' } })
      log(`  ${p.first}: submitted for review`)
    } catch (e) { log(`  (submit skipped for ${p.first}: ${e.message.slice(0, 90)})`) }
  }

  } // end create+annotate

  if (ds.consensus) {
    await call('POST', `/consensus/${datasetId}/generate`, { token: admin })
    const reviews = await call('GET', `/consensus/${datasetId}`, { token: admin })
    const conflicts = reviews.filter((r) => r.status !== 'AGREED' && r.hasConflict !== false)
    log(`  consensus: ${reviews.length} reviews, ~${conflicts.length} needing attention`)
    let resolved = 0
    for (const r of reviews) {
      if (resolved >= ds.resolve) break
      const fieldName = ds.fields[0].name
      const opts = ds.fields[0].extra.options
      try {
        await call('PATCH', `/consensus/${datasetId}/review`, { token: admin, body: { reviewId: id(r), fieldName, finalDecision: opts[0], resolvedBy: adminUserId } })
        resolved++
      } catch { /* row may not have a conflict on this field */ }
    }
    if (resolved) log(`  resolved ${resolved} review(s)`)
  }
}

async function main() {
  const adminLogin = await call('POST', '/auth/login', { body: ADMIN })
  const admin = adminLogin.accessToken
  const adminUserId = id(adminLogin.user)
  log(`admin ${ADMIN.email} ok`)
  const people = []
  for (const a of PEOPLE) { people.push(await ensureAnnotator(admin, a)); log(`annotator ${a.email}`); await sleep(1500) }
  for (const ds of DATASETS) await seedDataset(admin, adminUserId, people, ds)
  log('done')
  log(`annotator logins: ${PEOPLE.map((p) => p.email).join(', ')} / ${ANNOTATOR_PASSWORD}`)
}

main().catch((e) => { console.error('[seed] failed:', e.message); process.exit(1) })
