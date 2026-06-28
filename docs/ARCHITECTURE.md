---
title: "Annotation Platform Frontend — Architecture Review & Refactoring Roadmap"
subtitle: "Senior-engineer reverse-engineering, problem analysis, and production-grade refactoring strategy"
author: "Architecture Review"
date: "2026-06-28"
---

# 1. Executive Summary

This document is a senior-engineer review of the **Annotation Platform Frontend**, a
**Next.js 15 / React 19** application (~26,000 lines of TypeScript/TSX across ~90 files)
that lets admins upload datasets, configure annotation fields, clone-and-assign datasets to
annotators, collect annotations, run consensus review, and export results.

The codebase is **functional and feature-rich**, but it has accumulated significant
**structural debt** typical of fast feature delivery: two competing API-client conventions,
direct `localStorage` access scattered across 40 call-sites, ~950 lines duplicated between
two near-identical "workbench" components, several 1,000–1,500-line god components, and a
build that **silently suppresses all type and lint errors**.

## Headline risks

| # | Risk | Impact |
|---|------|--------|
| 1 | Build masks 18 TypeScript errors + 443 lint warnings (`ignoreBuildErrors`, `ignoreDuringBuilds`) | The compiler — the only automated safety net — is disabled. Regressions ship silently. |
| 2 | No automated tests anywhere in the repo | Every change is verified by hand; refactoring is high-risk. |
| 3 | 3 of 10 API modules bypass the shared 401-redirect interceptor | Inconsistent auth/session behavior; expired-token handling differs per feature. |
| 4 | ~950 duplicated lines across two workbench components | Every annotation bug must be fixed twice; they will drift. |
| 5 | JWT placed in a URL query string for one export (`data-overview.tsx:831`) | Token leaks into browser history, proxy logs, and `Referer` headers. |

## Baseline metrics (measured on `refactor/code-quality-architecture`)

| Metric | Value | How measured |
|--------|-------|--------------|
| Source size | ~26,341 lines, ~90 files | `find src -name '*.ts*' \| xargs wc -l` |
| `tsc --noEmit` errors | **18** (pre-existing) | `npx tsc --noEmit` |
| ESLint warnings | **443** | `npx next lint` |
| ESLint errors | 0 | `npx next lint` |
| Build error suppression | `typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true` | `next.config.ts` |
| Test files | **0** | repo scan |
| `console.*` statements | **291** across 27 files | grep |
| `any` / `as any` | **156** across 35 files | grep |
| Direct `localStorage` call-sites | **40** across 7 files | grep |

> **Scope note.** Per the engagement decision, this deliverable is **analysis only** — no
> source files were modified. All code blocks below are **reference implementations**
> illustrating the recommended target state; they are not applied to the codebase.

---

# 2. Reverse-Engineered Architecture

## 2.1 Technology stack

- **Framework:** Next.js 15.4 (App Router, `output: 'standalone'`), React 19.1
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4, Radix UI primitives, `class-variance-authority`, custom `ui/` component kit
- **Forms/validation:** `react-hook-form` + `zod` (schemas in `src/schemas/`)
- **HTTP:** `axios` (+ raw `fetch` in places)
- **Domain libs:** `exceljs` (export), `react-text-annotator` (text annotation)
- **Deployment:** Docker; `NEXT_PUBLIC_API_URL` baked in at build time

## 2.2 Layered view (as-is)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Presentation — src/app/* (App Router pages, route-level)            │
│   login · dashboard · users · dataset/[id]{,/annotation,/consensus}  │
│   tasks · profile · assignments/review · auth/callback               │
├─────────────────────────────────────────────────────────────────────┤
│  Components — src/components/*                                       │
│   annotation-* · dataset-* · field-config-* · upload-* · users-* ·   │
│   ui/* (design system) · sidebar · GoogleOAuth*                      │
├─────────────────────────────────────────────────────────────────────┤
│  Cross-cutting state — src/contexts/AuthContext.tsx                  │
│   (the ONLY global state; user + auth + heartbeat)                   │
├─────────────────────────────────────────────────────────────────────┤
│  Data access — TWO PARALLEL CONVENTIONS                              │
│   (A) src/lib/api.ts ............ shared axios (api / jsonApi) with  │
│        request+response interceptors (auth header, 401→/login)      │
│   (B) src/lib/api/*.ts .......... 10 feature modules; 7 reuse (A),   │
│        3 (datasets, users, consensus) use RAW axios + own helpers    │
├─────────────────────────────────────────────────────────────────────┤
│  Domain helpers — src/lib/* (csv/dataset export, drag-drop, utils)  │
│  Types — src/types/feature1.ts ; Schemas — src/schemas/*            │
└─────────────────────────────────────────────────────────────────────┘
                              │  HTTP (Bearer JWT)
                              ▼
              NestJS backend (separate container, README §9)
```

## 2.3 State & data-flow model

- **Global state** is limited to `AuthContext` (current user, `isAuthenticated`, auth actions,
  60-second heartbeat). Everything else is **component-local `useState`** plus **direct reads
  from `localStorage`**. There is **no client-side data cache** (no React Query/SWR), so each
  page refetches from scratch and shares nothing.
- **Auth token** lives in `localStorage.accessToken`; the user object in `localStorage.user`.
- **Cross-tab/OAuth signalling**: after the OAuth callback writes the token, code dispatches a
  `window` event `'auth-updated'` that `AuthContext` listens for to re-read `localStorage`
  (`AuthContext.tsx:128-138`).

## 2.4 Authentication flow

```
Email/password:  login() ─▶ POST /auth/login ─▶ store accessToken+user
                        ─▶ GET /users/profile (enrich) ─▶ setUser
                        ─▶ role==='ADMIN' ? /dashboard
                                          : getMyTasks() ? /tasks : /dashboard

Google OAuth:    /auth/google ─▶ Google ─▶ backend callback ─▶ JWT
                        ─▶ /auth/callback page stores token, dispatches 'auth-updated'

Session upkeep:  setInterval(authAPI.heartbeat, 60000)  // AuthContext.tsx:89
Expiry:          api.ts response interceptor: 401 ─▶ clear storage ─▶ window.location='/login'
                 (NOTE: only for calls made through the shared client)
```

## 2.5 End-to-end annotation lifecycle (the core domain flow)

```
ADMIN                                          ANNOTATOR(S)                 ADMIN
─────                                          ────────────                 ─────
create dataset                                                              
  POST /datasets
upload CSV
  POST /csv-processing/upload
  POST /csv-processing/add-to-dataset
configure fields
  POST /field-selection
clone & assign  ──────────────────────▶  GET /datasets/my-tasks
  POST /datasets/:id/clone-assign           (one private clone each)
  (1 clone + 1 task per annotator)          GET /dataset-merged-rows/:cloneId?page&limit=50
                                            PATCH .../row/:idx  (save annotation)
                                            GET  .../progress
                                            POST .../submit
add more CSV later                                                       generate consensus
  POST /csv-processing/...                                                 POST /datasets/:id/generate-consensus
  POST /datasets/:id/merge-into-clones                                   review disagreements
  (rows fan out to every clone)                                           GET  /datasets/:id/consensus-reviews
                                                                          PATCH .../consensus-reviews/:rid
                                                                        export
                                                                          GET /datasets/:id/export-consensus-csv
```

The **"clone-per-annotator"** model is the architectural heart: each annotator works on a
private full copy of the data, and the backend later compares clones row-by-row to compute
consensus. The frontend never computes consensus itself (correct separation).

---

# 3. Critical Problem Areas

Each finding lists **evidence** (`file:line`), **why it hurts**, and **severity**
(🔴 high / 🟠 medium / 🟡 low).

### 3.1 🔴 Two competing API-client conventions; 3 modules bypass interceptors

`src/lib/api.ts` defines shared axios instances (`api`, `jsonApi`) with request interceptors
(attach `Bearer` token) and response interceptors (on **401 → clear storage → redirect to
`/login`**, with a `PENDING_ACTIVATION` bypass). **7 of 10** feature modules use these.

But **3 modules use raw `axios`** with their own re-declared base URL and header helpers:

- `src/lib/api/datasets.ts:11,47-54` — re-declares `API_BASE_URL`, `authHeaders()`, `jsonHeaders()`; every call uses raw `axios`.
- `src/lib/api/consensus.ts:4,6-14` — same pattern.
- `src/lib/api/users.ts:3,31,50,73,87,102,112` — re-declares base URL; inlines `localStorage.getItem('accessToken')` at each call.

**Why it hurts:** Calls in these three modules **never trigger the 401 redirect** — an expired
session produces a raw rejected promise instead of the global logout/redirect. Auth behavior
is therefore **feature-dependent and inconsistent**, and any future change to token handling
must be made in four places.

### 3.2 🔴 No central token/session store — 40 direct `localStorage` call-sites

`localStorage.getItem('accessToken')` / `'user'` is read or written in **40 places across 7
files** (`AuthContext.tsx` ×13, `api.ts` ×6, `users.ts` ×6, `datasets.ts` ×2, `consensus.ts`,
`admin-login/page.tsx:48`, `data-overview.tsx:818,831`).

**Why it hurts:** Storage keys are stringly-typed and duplicated; switching to cookies/secure
storage (see 3.5) would require touching every site; SSR-safety (`localStorage` is undefined
on the server) is re-derived ad hoc; and the "is the user logged in" truth is smeared across
the app instead of owned by one module.

### 3.3 🔴 JWT leaked in a URL query string

`src/components/dataset-components/data-overview.tsx:831`:

```ts
window.open(`http://localhost:5000/clones/${clone._id}/export?token=${localStorage.getItem('accessToken')}`, '_blank');
```

**Why it hurts:** Bearer tokens in URLs leak into browser history, server access logs, and the
`Referer` header of any downstream request. This is a real security exposure, not just style.
(It also hardcodes the host/port — see 3.4.)

### 3.4 🟠 `API_BASE_URL` resolved in 9 places, with a port mismatch

`process.env.NEXT_PUBLIC_API_URL` is read in `api.ts:3`, `datasets.ts:11`, `users.ts:3`,
`consensus.ts:4`, `GoogleOAuthAdmin.tsx:19`, `GoogleOAuth.tsx:21`, plus hardcoded hosts in
`data-overview.tsx:831`. The fallbacks **disagree**:

- `GoogleOAuth.tsx:21` falls back to `http://localhost:5000`
- everything else falls back to `http://localhost:3001`
- README says the backend runs on `:5000`

**Why it hurts:** In any environment that relies on the fallback (misconfigured `.env`), Google
sign-in points at a different origin than the rest of the app. Config should have **one source
of truth**.

### 3.5 🟠 JWT in `localStorage` (XSS exposure)

Tokens in `localStorage` are readable by any script on the page; a single XSS becomes full
account takeover. **Why it hurts:** This is the standard SPA token-storage anti-pattern;
`httpOnly` cookies (or at minimum a documented threat model + strict CSP) are the production
posture. Flagged as a roadmap item, not a quick fix.

### 3.6 🔴 ~950 duplicated lines: `annotation-workbench` vs `dataset-annotation-workbench`

`annotation-workbench.tsx` (1374 L) and `dataset-annotation-workbench.tsx` (1406 L) are
**near-identical**. Measured overlap by concern:

| Concern | Overlap |
|---|---|
| `useState` set (20+ hooks) | ~95% identical |
| Data-loading effects | ~95% (differ only in which API module) |
| CSV export | ~85% |
| Metadata handling | ~90% |
| Keyboard shortcuts | 100% |
| Image/audio overlays | 100% |
| Navigation | ~95% |

Real differences: which API they call (`CSVImportsAPI` vs `DatasetMergedRowsAPI`), inspection
mode, and the completion modal.

**Why it hurts:** Every annotation feature/bugfix must be done twice; the two **will** diverge
silently (they partly already have). This is the single largest maintainability liability.

### 3.7 🟠 God components

| Component | Lines | `useState` | Distinct concerns |
|---|---|---|---|
| `field-config-components/field-config.tsx` | 1549 | 16 | CSV column select, field-type config, repeatable groups, validation, primary-key mgmt, new-column mgmt, load/save, expansion state (~8) |
| `dataset-annotation-workbench.tsx` | 1406 | 20+ | see 3.6 (~7) |
| `annotation-workbench.tsx` | 1374 | 21+ | see 3.6 (~7) |
| `new-column-data-panel.tsx` | 1035 | 2 | well-architected counter-example |
| `users-management.tsx` | 1021 | 18 | list/filter, invite modal, details drawer, delete confirm, status/permissions |
| `app/dashboard/page.tsx` | 858 | 7–10 | three role dashboards in one file |

**Why it hurts:** These files are hard to reason about, hard to test, and merge-conflict
magnets. `new-column-data-panel.tsx` (2 `useState`, heavy `useMemo` use) proves the team can
write clean components — the pattern just isn't applied consistently.

### 3.8 🟠 Duplicated helper logic

- **`formatDate`** — 4 identical copies: `dataset/[datasetId]/page.tsx:92`, `dataset-list.tsx:178`, `data-overview.tsx:373`, `users-management.tsx:286`.
- **IST timestamp** (`toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' })`) — 3 copies: `dataset-export-helper.ts:180,346`, `annotation-workbench.tsx:506`.
- **File download** — two different implementations: `consensus.ts:50` (axios `responseType:'blob'`) vs `datasets.ts:243` (raw `fetch().blob()`).

**Why it hurts:** Formatting/locale bugs must be fixed N times; the two download paths handle
errors and filenames differently.

### 3.9 🟠 AuthContext triplication

`login` (140-185), `signup` (187-237), and `signupAdmin` (239-273) in `AuthContext.tsx` are
~90% identical: store token → store user → `GET /users/profile` to enrich → `setUser` →
`startHeartbeat` → role-based redirect.

**Why it hurts:** Three copies of the session-establishment + redirect logic; the redirect rule
("admin→dashboard else my-tasks") is duplicated and easy to desync.

### 3.10 🟡 Hygiene: suppressed errors, console noise, `any`

- `next.config.ts:6,9` disables **both** ESLint and TypeScript build gates.
- **291 `console.*`** across 27 files, including emoji debug logs in `dataset-export-helper.ts:114-140` and 60+ each in both workbenches.
- **156 `any`/`as any`** (top: `dashboard/page.tsx` 20, `field-config.tsx` 18, `data-overview.tsx` 12).
- **18 real `tsc` errors** sit latent (mostly `field-config.tsx`, `admin-dataset-settings.tsx`, `clone-assign-modal.tsx`).

**Why it hurts:** The type checker is the cheapest test suite available and it is currently
turned off. Console noise hides real warnings and can leak data in production.

### 3.11 🟠 Derived state recomputed every render (no memoization)

`dashboard/page.tsx` (e.g. `parentDatasets`/`cloneDatasets`/`annotators`/`recentActivity` ~245-270),
`users-management.tsx` (`invitedUsers`/`nonInvitedUsers`/`filtered*` 93-117), and both
workbenches recompute filtered/sorted arrays on **every render** instead of `useMemo`.

**Why it hurts:** Wasted CPU on every keystroke/state change; grows with dataset/user count.

### 3.12 🟠 Scalability ceilings

- Merged-rows are paginated (`limit: 50`, `dataset-merged-rows.ts:124`), but annotation and
  consensus lists render **without virtualization** — large datasets mount thousands of nodes.
- **No client cache / request dedup** — navigating between pages refetches everything; no
  shared cache across components.
- **No retry/backoff** on transient network errors.

---

# 4. Findings by Category (the five requested lenses)

## 4.1 Bad architecture decisions
- **Two API conventions** (§3.1) — the existence of both `lib/api.ts` and raw-axios modules is the root architectural inconsistency.
- **No state/data layer** beyond `AuthContext` — every component is its own data manager (§2.3, §3.12).
- **Build gates disabled** (§3.10) — the architecture has no compile-time contract enforcement.
- **Config not centralized** (§3.4) — environment resolution is copy-pasted.

## 4.2 Duplicate logic
- Workbench twins (~950 lines, §3.6) — by far the biggest.
- AuthContext login/signup/signupAdmin (§3.9).
- `formatDate` ×4, IST timestamp ×3, two download implementations (§3.8).
- Re-declared `API_BASE_URL` + auth-header helpers in 3 modules (§3.1).

## 4.3 Performance bottlenecks
- Unmemoized derived state across dashboards/workbenches/users (§3.11).
- Inline functions/arrays recreated per render inside `.map()` bodies (field-config field cards, workbench export handlers).
- No list virtualization (§3.12).

## 4.4 Scalability risks
- Lists not virtualized; no cache/dedup; no retry (§3.12).
- God components become merge/cognitive bottlenecks as the team grows (§3.7).
- Token-in-URL and token-in-localStorage limit multi-tenant/security hardening (§3.3, §3.5).

## 4.5 Maintainability issues
- Suppressed type/lint errors + zero tests = no safety net (§3.10).
- 1,000–1,500-line files (§3.7).
- Stringly-typed storage keys and scattered `localStorage` (§3.2).
- 291 console statements and 156 `any` erode signal (§3.10).

---

# 5. Clean Target Architecture

```
src/
  lib/
    config.ts           ← single source: API_BASE_URL + all magic numbers
    auth-storage.ts     ← the ONLY module that touches localStorage for auth
    http/
      client.ts         ← ONE axios instance (interceptors: auth + 401 + retry)
      download.ts       ← ONE blob-download helper (filename parsing included)
    format.ts           ← formatDate, formatISTTimestamp, etc. (single copy)
    logger.ts           ← dev-gated logger; replaces console.*
    api/*.ts            ← thin endpoint wrappers, ALL using http/client.ts
  hooks/
    useAnnotationWorkbench.ts   ← shared logic for both workbench screens
    useDerived*.ts              ← memoized selectors where useful
  contexts/AuthContext.tsx      ← uses auth-storage + a shared establishSession()
  components/                   ← god components split into focused children
  types/                        ← shared domain types (no per-file redeclaration)
```

**Principles:** one source of truth for config and storage; one HTTP client so auth/error
behavior is uniform; deduplicate by extracting hooks and helpers, not by copy-paste; let
TypeScript enforce contracts (re-enable gradually); keep components small and single-purpose.

---

# 6. Refactoring Strategy (Tiered Roadmap)

Ordered by **value ÷ risk**. Tier 1 is safe and behavior-preserving; Tier 3 is structural and
should follow a test-harness investment.

## Tier 1 — Safe, behavior-preserving (do first)
1. **`lib/config.ts`** — export `API_BASE_URL` and constants (`HEARTBEAT_MS=60000`, `NOTIFICATIONS_POLL_MS=15000`, `TOAST_MS=5000`, `ROWS_PAGE_SIZE=50`). Replace 9 env reads + magic numbers. Resolves the port mismatch (§3.4).
2. **`lib/auth-storage.ts`** — `getToken/setToken/getUser/setUser/clearAuth`, SSR-guarded. Replace all 40 sites (§3.2).
3. **Unify HTTP** — point `datasets.ts`/`consensus.ts`/`users.ts` at the shared client (or a shared `authHeaders()` helper) so all 10 modules behave identically (§3.1). Single `download.ts` (§3.8).
4. **`lib/format.ts`** — one `formatDate` + `formatISTTimestamp`; delete the 7 copies (§3.8).
5. **`lib/logger.ts`** — dev-gated; strip/route the 291 `console.*` (§3.10).
6. **AuthContext dedup** — extract `establishSession()` + `redirectAfterAuth()` (§3.9).

## Tier 2 — Medium risk, high value
7. **`useAnnotationWorkbench` hook** — lift the shared ~950 lines; each screen becomes a thin view (§3.6).
8. **Memoize derived state** — `useMemo` for filtered/sorted arrays in dashboards/users/workbenches (§3.11).

## Tier 3 — Structural (after a test harness exists)
9. **Split god components** (§3.7) — e.g. `field-config` → CSVColumns / FieldTypeConfig / GroupsEditor / validation hook.
10. **Re-enable type checking incrementally** — fix the 18 errors, then flip `ignoreBuildErrors` to `false` in CI; replace `any` (§3.10).
11. **Introduce a data layer** — TanStack Query (or SWR) for caching/dedup/retry; add list virtualization (§3.12).
12. **Harden auth** — move tokens to `httpOnly` cookies; remove token-in-URL (§3.3, §3.5).

---

# 7. Improved Production-Grade Code (Reference Implementations)

> Illustrative target patterns — **not applied** to the codebase.

## 7.1 Central config (`lib/config.ts`)

```ts
// Single source of truth for environment + tunables.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export const TIMINGS = {
  heartbeatMs: 60_000,
  notificationsPollMs: 15_000,
  toastMs: 5_000,
} as const;

export const PAGINATION = { rowsPageSize: 50 } as const;
export const STORAGE_KEYS = { token: 'accessToken', user: 'user' } as const;
```

## 7.2 Central token store (`lib/auth-storage.ts`)

```ts
import { STORAGE_KEYS } from './config';

const isBrowser = typeof window !== 'undefined';

export const authStorage = {
  getToken(): string | null {
    return isBrowser ? localStorage.getItem(STORAGE_KEYS.token) : null;
  },
  setToken(token: string) {
    if (isBrowser) localStorage.setItem(STORAGE_KEYS.token, token);
  },
  getUser<T = unknown>(): T | null {
    if (!isBrowser) return null;
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed[0] : parsed; // preserves existing behavior
    } catch {
      return null;
    }
  },
  setUser(user: unknown) {
    if (isBrowser) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },
  clear() {
    if (!isBrowser) return;
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  },
};
```

## 7.3 One HTTP client for every module (`lib/http/client.ts`)

```ts
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { authStorage } from '../auth-storage';

export const http = axios.create({ baseURL: API_BASE_URL });

http.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 &&
        error.response?.data?.message !== 'PENDING_ACTIVATION') {
      authStorage.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

**Before** (`datasets.ts`, repeated per module):

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };
}
async getAll() {
  const res = await axios.get(`${API_BASE_URL}/datasets`, { headers: authHeaders() });
  return res.data;
}
```

**After** (uniform 401 handling, no re-declaration):

```ts
import { http } from '@/lib/http/client';
async getAll(): Promise<DatasetResponse[]> {
  const res = await http.get('/datasets');
  return res.data;
}
```

## 7.4 One blob-download helper (`lib/http/download.ts`)

```ts
import { http } from './client';

export async function downloadFile(url: string, fallbackName = 'download') {
  const res = await http.get(url, { responseType: 'blob' });
  const cd = res.headers['content-disposition'] ?? '';
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = Object.assign(document.createElement('a'), { href, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
}
```

This also removes the §3.3 token-in-URL leak: the export goes through the auth header instead
of `?token=...`.

## 7.5 Deduplicated AuthContext

```ts
async function establishSession(authResponse: { accessToken: string; user: User }) {
  authStorage.setToken(authResponse.accessToken);
  authStorage.setUser(authResponse.user);
  let current = authResponse.user;
  try {
    current = await usersAPI.getProfile();
    authStorage.setUser(current);
  } catch { /* keep basic user — preserves existing fallback */ }
  setUser(current);
  startHeartbeat();
  return current;
}

async function redirectAfterAuth(user: User) {
  if (user?.role?.toUpperCase() === 'ADMIN') return router.push('/dashboard');
  try {
    const tasks = await datasetsAPI.getMyTasks();
    router.push(tasks?.length ? '/tasks' : '/dashboard');
  } catch {
    router.push('/dashboard');
  }
}

// login / signup / signupAdmin now each call these two — ~120 lines → ~30.
```

## 7.6 Shared workbench hook (skeleton)

```ts
// hooks/useAnnotationWorkbench.ts — collapses the ~950 duplicated lines.
export function useAnnotationWorkbench(opts: {
  loadRows: (taskId: string, page: number) => Promise<RowsPage>;
  saveRow: (taskId: string, idx: number, ann: Record<string, unknown>) => Promise<void>;
  mode: 'csv' | 'merged';
}) {
  // shared: tasks, currentIndex, history/undo, keyboard nav, overlays, export, progress…
  // each screen passes only its API + mode and renders the returned state.
}
```

## 7.7 Memoized derived state

```ts
// Before (recomputed every render):
const annotators = allUsers.filter((u) => u.role === 'ANNOTATOR');
// After:
const annotators = useMemo(
  () => allUsers.filter((u) => u.role === 'ANNOTATOR'),
  [allUsers],
);
```

---

# 8. Verification Strategy for Future Refactoring

Because the build masks errors and there are no tests, any future implementation should treat
these as the regression gates:

1. **Establish a test harness first** (the highest-leverage investment): Vitest + React Testing
   Library for `lib/` helpers and AuthContext; Playwright for the login → annotate → consensus →
   export happy path. Refactor *after* this exists.
2. **Type-error budget:** `npx tsc --noEmit` must report **≤ 18** errors (the current baseline)
   after any change; the goal is to drive it to 0 and then set `ignoreBuildErrors: false` in CI.
3. **Lint budget:** `npx next lint` warnings must not exceed **443**.
4. **Build:** `npm run build` stays green.
5. **Manual smoke test** of each role flow (admin upload/clone/consensus/export; annotator
   tasks/annotate/submit) until E2E coverage exists.

---

# 9. Appendix — Audit Metrics

| Area | Count | Top offenders |
|---|---|---|
| `console.*` | 291 / 27 files | annotation-workbench (62), dataset-annotation-workbench (60), dataset-export-helper (34) |
| `any` / `as any` | 156 / 35 files | dashboard/page (20), field-config (18), data-overview (12) |
| Direct `localStorage` | 40 / 7 files | AuthContext (13), api.ts (6), users.ts (6) |
| `API_BASE_URL` reads | 9 | api.ts, datasets, users, consensus, GoogleOAuth(×2), data-overview |
| `formatDate` copies | 4 | dataset/[id]/page, dataset-list, data-overview, users-management |
| IST-timestamp copies | 3 | dataset-export-helper (×2), annotation-workbench |
| `tsc` errors (latent) | 18 | field-config (11), admin-dataset-settings (4), clone-assign-modal (2), new-column-data-panel (1) |
| Files > 1000 lines | 5 | field-config (1549), dataset-annotation-workbench (1406), annotation-workbench (1374), new-column-data-panel (1035), users-management (1021) |

### Largest files (LOC)

```
1549  field-config-components/field-config.tsx
1406  annotation-components/dataset-annotation-workbench.tsx
1374  annotation-components/annotation-workbench.tsx
1035  new-column-components/new-column-data-panel.tsx
1021  users-components/users-management.tsx
 915  dataset-components/data-overview.tsx
 874  upload-components/csv-upload-component.tsx
 858  app/dashboard/page.tsx
 788  dataset-components/admin-dataset-settings.tsx
```

---

*Prepared as an analysis-only deliverable. No source files were modified; all code blocks are
reference implementations for the recommended target state.*
