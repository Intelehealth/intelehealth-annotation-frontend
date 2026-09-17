# Dyno Annotation Platform - Frontend Task Status

## Phase 18 — RAG Chat UI (collapse-by-default, controlled open) (2026-08)
- `CollapsibleSection` now supports **controlled `open`/`onOpenChange`**; `RagAssistant` is driven by `document-view-context.expandedChat` → **collapsed by default**, opens when "Ask RAG"/a related-question click calls `askQuestion` (which sets `expandedChat(true)`). Chat + history state stays mounted while collapsed.
- Gates: `tsc` clean (19 pre-existing); vitest **51/51**.

## Phase 11 — Dynamic model catalog (2026-08)
- `RagAssistant` model dropdown already driven by `ragAPI.models()` → real `/rag/models` (OpenRouter catalog with availability). Removed the **hardcoded `GEMINI` fallback option**; when catalog is empty it now shows "No models available (check /rag/models)". No hardcoded model IDs.
- Gates: `tsc` clean (19 pre-existing); no-mock clean.

## Phase 7 — Related Questions → orchestrator (2026-08)
- `RelatedQuestionCard`: added **"Ask RAG"** action → `document-view-context.askQuestion(question)` (new) which sends the real question through `ragAPI.orchestrate` (`POST /orchestrator/query`), appends user+assistant messages, sets `expandedChat`, shows real citations/confidence. Citation chips + "Add as Annotation Question" remain.
- Backend generation **verified PASS** (real OpenRouter chat; `matrix/phase7-related-v2.mjs` — 5 grounded questions with confidence/coverage/citations persisted in Mongo).
- Gates: `tsc` clean (19 pre-existing); vitest **51/51**; no-mock clean.

## Phase 6 — Annotation Questions (2026-08)
- Verified the existing flow is real and complete: `AnnotationQuestions` reads `fieldSelectionAPI.getDatasetFieldConfig` → real `annotationconfigs`; `AddQuestionDialog` persists via `saveDatasetFieldConfig` (`POST /field-selection/dataset/:id`, exactly one `isPrimaryKey` field), then `onAdded()` refreshes. Backend matrix `phase6-annotation.mjs` **ALL PASS** (add → Mongo → re-read).
- No frontend source change required (already real, one annotation system).

## Phase 5 — All real previews (2026-08)
- **PDF (`pdf-preview.tsx`) fixed for pdfjs-dist@6:** `getDocument({ url })`, `loadingTask.destroy()` (removed `PDFDocumentProxy.destroy`), `render({ canvas, canvasContext, viewport })`; **cleared the 3 pre-existing TS errors**. Added real states: LOADING ("Loading PDF preview..."), ERROR ("Unable to render this PDF.")+Retry (re-loads same URL)+"Download original PDF", plus zoom + Page X/Y + prev/next. Citation `currentPage` jump preserved.
- **Image (`image-preview.tsx`):** LOADING, ERROR ("Unable to display this image.")+Retry+Download-original; zoom kept; renders only the real uploaded bytes.
- **ZIP (`zip-preview.tsx`): real child explorer** — loads actual archive bytes via `jszip` (declared dep), lists real entries (name/size), opens each by its real type (image/svg → <img>, pdf → iframe, else text/raw), original archive downloadable; loading/error/retry.
- **`document-preview.tsx`:** passes `name` to PDF, and the **archive buffer** to the ZIP explorer; URL documents already served by real content type (HTML → unsupported + download).
- Gates: `tsc --noEmit` — **no errors in Phase-5 files** (19 total = pre-existing minus the 3 fixed pdf-preview errors); vitest **51/51**; no-mock scan clean.
- No backend changes; previews still read only real stored bytes/rows.

## Phase 4 — Document View state architecture (2026-08)
- **`document-view-context` extended (additive; no consumer breakage):** `currentView`, `currentDocumentType` (+ pure `documentTypeFor` helper), `selectedRow`, `selectedSheet`, `selectedSourceLocation` (`SourceLocation` union: PDF/IMAGE/CSV/XLSX/SVG/ZIP), `annotationQuestions`, `relatedQuestions`, `conversationId`, `expandedChat`. `openCitation` now also propagates `rowIndex` → `selectedRow` (CSV row focus). Layout unchanged.
- **Blue-accent polish (approved):** `emerald-*` → `blue-*` across `src/components/document-intelligence/**` (25 files, 0 emerald remaining, ~55 blue classes; layout/style structure unchanged).
- New spec `context/document-view-context.spec.ts` (`documentTypeFor` by extension + mime + null).
- Gates: `tsc --noEmit` — zero errors introduced by Phase 4 (remaining 22 are pre-existing incl. the known `pdf-preview.tsx` pdfjs-v6 errors, fixed in Phase 5); vitest **51/51 passed**; no-mock grep clean.

## Phase 3 — Document processing (mirrored fixtures) (2026-08)
- `e2e/fixtures/` updated with text-bearing `invoice-scan.png/.jpg/.webp`, scanned `invoice-scan.pdf`, and **user real handwritten `handwritten-note.webp`** (mirrored from backend `test/fixtures`).
- Backend Phase-3 matrix verified all types (ALL PASS); this phase was backend-centric — frontend changes are fixture mirroring only.
- No frontend source changes.

## Phase 2 — Real fixtures + independent verifiers (2026-08)
- **`e2e/fixtures/`** — mirror of backend `test/fixtures` (real `invoice.csv/xlsx/xls`, `invoice.png`, `receipt.jpg`, `logo.webp`, `invoice.pdf`, `logo.svg`, `bundle.zip`, `compliance-policy.pdf`, `compliance-audit.csv`, `security-controls.xlsx`); `e2e/fixtures/README.md` documents regen + mirror from the backend generator/verifier.
- **`e2e/verifier.ts`** — independent expected-value helper (own `parseCsv`, `sumColumn`, `expectedInvoiceSum()` = 57300).
- **Refactored `e2e/tests/analytics-agent.spec.ts`**: removed hardcoded `43,200`; now self-contained — register → create dataset → upload real `e2e/fixtures/invoice.csv` via `/csv-processing/upload` → ask "What is the sum of Total?" → assert streamed answer matches verifier-computed `57300`. Skips as **BLOCKED** (not a fake pass) when no backend/token is available.
- **No app/source code changes** — fixtures + verifier + test only.

## Phase 1 — E2E preflight + Analytics skill docs (2026-08)
- **E2E preflight — GREEN:** FE `/login` → 200; backend `/` → 200; Mongo `127.0.0.1:27017` up; OpenRouter key present in backend env; backend fresh build present (`dist/csv-processing/excel-reader.js`); FE dev server running.
- Created `files/skills/analytics/README.md` documenting the **real** Analytics frontend surface: `src/app/dataset/[datasetId]/analytics/page.tsx`, `DatasetAgentChat`, `DatasetStatsReport`, `analyticsAPI` endpoints, SSE agent client, orchestrator note (FE never decides intent), error/empty honesty, and the Text2SQL (DuckDB) roadmap.
- No analytics code changes; docs only.

## COMPLETED — Phase 10: Workbench navigation cleanup + live E2E status (2026-08)
- **Dataset Analytics removed from the workbench** (requirement): `annotation-view-switcher.tsx` `ViewMode` now `annotation | document-view` (removed `dataset-analytics` + `BarChart3`); `dataset-annotation-workbench.tsx` removed the inline `DatasetAnalyticsView` branch + import; deleted `src/components/annotation-components/dataset-analytics-view.tsx`.
- Workbench navigation is now `[Back to Dataset] [Annotation] [Document View]` only (two modes). Standalone `/dataset/[datasetId]/analytics` page preserved.
- Verification: `npx tsc --noEmit` clean; `npm run build` clean (all routes built).
- **Live E2E (backend-driven, Node 24):** backend now boots + runs real OpenRouter vision; upload→202 QUEUED→PROCESSING→COMPLETED with real rows/columns verified for PNG/JPG/WEBP/ZIP (availableColumns `source:DOCUMENT`). Frontend Field Config "Document Columns" group + Document View (original asset) consume these real columns. DOCX header-inference limitation + PDF/scanned/office-not-live noted as NOT VERIFIED in backend tasks.md.

## COMPLETED — Phase 9: Document-processing frontend integration + hardening (2026-08)
- `src/lib/api/processing.ts` — added `getProcessorStatus()` → `GET /document-processing/processor/status` (truthful MongoDB-backed processor status).
- `MultiSourceUploadComponent` — worker banner now reads the **real** processor status (`getProcessorStatus()`, not the legacy worker endpoint); no fabricated "worker connected" state. Removed unused `WorkerStatus` import.
- `DocumentSourceList` — FAILED / NEEDS_REVIEW rows now show a real reason line ("Extraction failed." / "Extraction is uncertain and needs review.") using existing API status (frontend-only, decision A).
- Verified already-present behaviors (no change needed): Field Config renders a selectable **"Document Columns"** group (`csv-columns-display.tsx`) from `availableColumns[source==='DOCUMENT']`, loads availableColumns on mount; `DocumentSourcePreview` + Annotation workbench `DocumentPreview` render the **original** uploaded PDF (iframe) / image (img) via `getDocumentContent` — never extracted text; `upload-errors.ts` shows "Upload timed out" only on genuine client timeout (202 QUEUED never becomes a timeout); two-panel workbench + one-row nav preserved; Dataset Analytics stays inside the workbench.
- Verification: `npx tsc --noEmit` clean; `npm run build` clean (all routes built, incl. `/dataset/[datasetId]`, `/annotation`, `/analytics`).
- CSV/XLS/XLSX behavior untouched; no backend changes in Phase 9.

## E2E — NOT VERIFIED (environment blocker)
Real upload→DatasetAsset→QUEUED→PROCESSING→rows/columns→DatasetRow→availableColumns→Field Config→Annotation→Document View **could not be verified in this environment**: the backend `dist/main.js` never reaches the HTTP-listen state (no output on :4000 over 45s+; process stays alive but never binds — likely Mongoose DB connection hangs before `app.listen`). Requires a backend that boots to serving + real OpenRouter key + LibreOffice. Not claimed complete (reported honestly).

## COMPLETED — Per-category upload UI + category wiring (2026-08, Phase 1)
- `MultiSourceUploadComponent` generalized with `acceptedExtensions`, `dropLabel`, `allowUrl`, `urlOnly`, and `category` props.
- New wrapper components: `image-upload-component.tsx`, `pdf-upload-component.tsx`, `url-upload-component.tsx`, `office-upload-component.tsx`.
- `DatasetUploadComponent` now has five tabs: CSV / Excel · Images · PDFs · Links / URLs · Office / Other.
- Frontend sends `category` (`csv-excel | images | pdf | links | office | generic`) with both file and URL uploads via `src/lib/api/processing.ts`.
- Skills docs updated: `files/skills/{csv-excel,images,pdf,links,office}/SKILL.md` + `files/skills/document-processing/SKILL.md`.
- Verification: `npx tsc --noEmit` passes; `next build` compiles successfully.

## COMPLETED
- Authentication UI (JWT + Google OAuth + local)
- User Management UI (CRUD, roles, status workflow)
- Dataset CRUD UI (with access control, sharing, soft delete)
- CSV Upload/Parse UI (CSV + XLSX, validation, progress)
- Annotation Workbench (drag-and-drop, image metadata)
- Annotation Config UI (13 field types, groups, branching, versioning)
- Dataset Clone & Assign UI (physical clones with deep copy)
- Consensus Review UI (voting, strategies, sessions)
- Export UI (CSV/Excel download)
- Notifications UI (16 event types)
- Change Requests UI
- Clone Sync UI
- Field Permissions UI
- Image Proxy (authenticated blob requests)
- Analytics Page (processing, annotation, consensus metrics)
- AI Analytics Agent Panel (8 read-only tool queries)
- Multi-Source Upload Component (local files, URLs, sequential status)
- Document Source List (filename, type, size, status, polling)
- Annotation View Switcher (Annotation, Document View, Dataset Analytics)
- Workbench navigation overhaul: "Back to Dataset" header + view mode buttons
- Document Preview: CSV inline table (paginated), XLSX inline table (sheet selector + exceljs), PDF/Image/SVG rendering, Office download links
- Document source resolution via `/processing/dataset/:id/row/:index/source` endpoint
- URL-based view state persistence (`?view=annotation|document|dataset-analytics`)
- Analytics route redirects to workbench with `?view=dataset-analytics`
- DatasetRowRepository returns documentId in mergedRows for document datasets
- Workspace Management Shell (routes, layout, sidebar, topnav reuse)
- Workspace Templates Page
- Configure Workspace Page
- Create Custom Workspace Page
- Workspace Dashboard
- Projects Listing
- Project Dashboard
- Dataset Dashboard

## VERIFIED
- Production build passes
- TypeScript compilation passes
- Existing consensus Playwright coverage passes
- Multi-source upload: build, TypeScript, Prettier checks pass
- Document list and preview: build, TypeScript checks pass
- Processing status SSE: build, TypeScript, ESLint checks pass
- Annotation view switcher: build, TypeScript checks pass
- Analytics page: build, TypeScript checks pass
- Document View CSV/XLSX inline preview: TypeScript checks pass
- Workbench navigation (Back to Dataset + 3 modes): TypeScript checks pass
- Analytics redirect: build checks pass
- DatasetRowRepository documentId propagation: TypeScript checks pass
- AnalyticsService unit tests: 12 test cases covering zero/empty/populated states

## PENDING VERIFICATION
- Workspace Management full integration test
- Responsive layout verification (desktop, tablet, mobile)
- Keyboard navigation and accessibility audit

## OPTIONAL / FUTURE
- Real-time collaborative editing UI
- Document comparison/diff view
- Advanced search across documents
- Bulk export with custom field selection
- Mobile responsive views for annotation