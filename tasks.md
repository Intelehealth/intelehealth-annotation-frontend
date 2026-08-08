# Dyno Annotation Platform - Frontend Task Status

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