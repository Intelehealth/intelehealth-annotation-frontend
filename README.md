# Latent Verify — frontend

The web app for Latent Verify, LatentSig's multi-annotator data annotation platform: administrators create datasets and define the questions annotators answer, annotators label isolated copies of the data, and the platform measures agreement and runs a review flow so exported labels come with a reliability figure attached.

This repository is the Next.js frontend only. It talks to a separate backend service over HTTP.

| | |
|---|---|
| Live site | https://data-annotation-frontend-1045030213449.asia-south1.run.app |
| Backend API (production) | https://annotation-backend-1045030213449.asia-south1.run.app |
| Backend API (local default) | `http://localhost:4000` |
| Docs (in-app) | `/documentation` |

## Stack

- **Next.js 15.4** (App Router, `output: 'standalone'`), **React 19**, **TypeScript**
- **Tailwind CSS v4** with shadcn/Radix primitives
- Framer Motion, GSAP + Lenis (landing page motion), Recharts (statistics), pdf.js (document preview), ExcelJS (exports)
- Playwright for end-to-end tests

Node 20 or newer. `.nvmrc` pins 24; CI builds on 20; the Docker image uses `node:26-alpine`.

## Getting started

```bash
git clone https://github.com/latentsig/annotation-platform-frontend.git
cd annotation-platform-frontend
npm install
```

Create `.env.local`:

```bash
# Where the frontend sends API calls. Baked into the client bundle at build
# time — change it and rebuild.
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Point it at the production backend instead if you are not running one locally:

```bash
NEXT_PUBLIC_API_URL=https://annotation-backend-1045030213449.asia-south1.run.app
```

Then:

```bash
npm run dev        # http://localhost:3000, hot reload
```

`NEXT_PUBLIC_API_URL` is the only environment variable the frontend reads. Document uploads go through a same-origin proxy: `next.config.ts` rewrites `/processing/*` to the backend so multipart uploads are not cross-origin; every other API call goes to the backend URL directly.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server. Runs `predev` first, which copies the pdf.js worker into `public/`. |
| `npm run build` | Production build (standalone). Runs `prebuild` (same worker copy). |
| `npm start` | Serve a production build. |
| `npm run lint` | ESLint via `next lint`. |
| `npm run test:e2e` | Playwright suite in `e2e/` (consensus workflow, statistics, CSV mapping, negative paths). |
| `npx tsc --noEmit` | Type check. The build has `ignoreBuildErrors` on, so run this separately. |

`scripts/copy-pdf-worker.mjs` exists because pdf.js needs its worker served as a URL; copying it from `node_modules` on every build keeps it version-matched to the installed `pdfjs-dist` and served from our own origin rather than a CDN. `public/pdf.worker.min.mjs` is generated and git-ignored.

## Project layout

```
src/
  app/                      routes (App Router)
    page.tsx                landing page
    documentation/          user docs: _docs/ (registry, content, shell, graph, search)
                            [slug]/ pages, search-index/ route, _legacy/ (old spec, unrouted)
    dashboard/ dataset/ tasks/ assignments/ users/ profile/   the application
    login/ admin-login/ ... auth flows
  components/
    landing/                landing sections, header, hero annotator, animations
    annotation-components/  the workbench: image, audio and text tools, media preview
    field-config-components/ schema editor: field types, groups, nested/conditional fields
    consensus/              collaborative review grid
    dataset-components/     dataset list, settings, clone & assign, schema change requests
    document-intelligence/  document view, retrieval assistant, coverage
    ui/                     shadcn primitives
  data/                     static content: navigation, FAQ
  lib/  hooks/  contexts/   API client, animation vocabulary, auth context
  middleware.ts             auth gate for app routes
e2e/                        Playwright specs
docs/ARCHITECTURE.md        internal code-quality audit (not user docs)
```

### Application routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/documentation`, `/documentation/[slug]` | User documentation (nine pages, global search, page map) |
| `/login`, `/admin-login`, `/verify-email`, `/create-password`, `/forgot-password`, `/reset-password`, `/auth/callback` | Authentication |
| `/dashboard` | Workspace overview |
| `/dataset`, `/dataset/add-dataset` | Dataset list and creation |
| `/dataset/[id]` | Dataset detail: items, schema, settings, clone & assign |
| `/dataset/[id]/annotation` | Annotation workbench |
| `/dataset/[id]/consensus`, `/generate-consensus` | Consensus configuration and computation |
| `/dataset/[id]/review-session/[shareCode]` | Shared review session for resolving conflicts |
| `/dataset/[id]/statistics`, `/analytics` | Agreement statistics, annotator performance, exports |
| `/tasks` | An annotator's assignments and their statuses |
| `/assignments/review` | Review requests (approve, request rework) |
| `/users`, `/profile` | Team management, own account |

## Landing page

`src/app/page.tsx` composes `src/components/landing/sections/*`. Design notes that are not obvious from the code:

- The header is fixed over sections that alternate beige/charcoal. Each section root carries `data-nav="light|dark"`; the header reads which one is under it and flips its own colours. Add the attribute to any new section.
- Section animations are CSS keyframes on inline SVG, not JS. Each drawing's loop length is passed to the `Timeline` beneath it so the playhead stays in sync.
- Palette lives on `--lp-*` tokens in `globals.css` (`.landing-page` scope); docs use `--doc-*`. Both are independent of the app's shadcn tokens.
- Lenis owns scrolling and is wired to GSAP's ticker and ScrollTrigger in `SmoothScrollProvider`; anything using ScrollTrigger must go through it.

## Documentation

`/documentation` is generated from `src/app/documentation/_docs/registry.tsx`. To add a page: write its body in `content.tsx` using the primitives (`H2`, `Steps`, `Table`, `Callout`, `D` for internal links), add an entry to the registry with its `sections` (these drive the on-page TOC) and `related` slugs (these draw the connection graph). Search is full-text over an index the server builds by rendering each page to static markup (`search-index/route.ts`); nothing to regenerate.

## Docker

```bash
docker compose up --build
# or
docker build --build-arg NEXT_PUBLIC_API_URL=https://annotation-backend-1045030213449.asia-south1.run.app -t latent-verify-frontend .
docker run -p 3000:3000 latent-verify-frontend
```

The image is a two-stage build producing the standalone server; `NEXT_PUBLIC_API_URL` is a build argument because it is compiled into the bundle.

## Deployment

GitHub Actions → Google Artifact Registry → Cloud Run, all in `asia-south1` (project `refined-outlet-249712`), authenticated with Workload Identity Federation (no stored keys).

| Workflow | Trigger | Result |
|---|---|---|
| `ci-cd.yml` | push to `feature/nested-conditional-questions`, or manual | build, push image `data-annotation/frontend`, deploy service `data-annotation-frontend` (the live site) |
| `deploy-development.yml` | push to `dev`, or manual | development deployment |
| `pr-check.yml` | pull requests to `main`, `dev` | build validation |

Note that the production deploy is tied to `feature/nested-conditional-questions`, not `main`. Merging to that branch deploys.

## Branches

- `feature/nested-conditional-questions` — deploy branch; contains `main` and `feature/multi-dataset-upload`
- `rehaul` — landing page redesign, header, user documentation, and the fix that restored the production build (feature-by-feature commits)
- `feature/rag-document-intelligence`, `feature/analytics-integration` — carry commits not yet in the deploy branch

## Related

- Backend: separate repository (NestJS). Its URL is the only thing this app needs from it; setup lives in that repo's README.
- `docs/ARCHITECTURE.md` — internal audit of the frontend's structure and known problem areas.
