# Frontend Document Processing

## Status

The generic source-upload UI is implemented on `feature/multi-dataset-upload`, restructured into
per-category upload tabs. Upload + document status integration is implemented (Phase 9). OCR,
extraction visual segmentation, and analytics UI remain future milestones where applicable.

## Status / Diagnostics Integration (Phase 9)

- `processingAPI.getProcessorStatus()` → `GET /document-processing/processor/status` for the
  truthful MongoDB-backed processor state. `MultiSourceUploadComponent`'s worker banner reads this
  — it never shows a fabricated "worker connected" state.
- `document-source-list.tsx` shows a real reason line for FAILED / NEEDS_REVIEW documents
  (frontend-only; uses existing API status).
- Field Config renders a selectable **"Document Columns"** group (`csv-columns-display.tsx`) from
  `availableColumns[source==='DOCUMENT']` (real extracted columns only).
- `DocumentSourcePreview` and the Annotation workbench `DocumentPreview` render the **original**
  uploaded file (PDF iframe / image `<img>`) via `getDocumentContent` — never extracted text as a
  substitute.
- `upload-errors.ts` shows "Upload timed out" only on a genuine client timeout (ECONNABORTED /
  ETIMEDOUT); a successful 202 `{status:'QUEUED'}` never becomes a timeout.

## Per-Category Upload UI

`DatasetUploadComponent` (`src/components/upload-components/dataset-upload-component.tsx`) provides
five top-level tabs:

- `CSV / Excel` — `csv-upload-component.tsx` (preserved legacy tabular workflow)
- `Images` — `image-upload-component.tsx`
- `PDFs` — `pdf-upload-component.tsx`
- `Links / URLs` — `url-upload-component.tsx`
- `Office / Other` — `office-upload-component.tsx`

Each non-CSV tab renders a thin wrapper around the generalized `MultiSourceUploadComponent` and
shares `DocumentSourceList` below the panel. See the per-category skill files:

- `files/skills/csv-excel/SKILL.md`
- `files/skills/images/SKILL.md`
- `files/skills/pdf/SKILL.md`
- `files/skills/links/SKILL.md`
- `files/skills/office/SKILL.md`

## Existing Upload Preservation

`CSVUploadComponent` remains the existing tabular-data workflow. Do not replace its preview,
header validation, schema synchronization, or redirect behavior.

## Generic Source UI

`MultiSourceUploadComponent` is shared by the category wrappers and supports:

- Multiple local files in the configured category extension set.
- Per-category extension validation and a matching error message.
- Sequential upload status per file.
- Generic Document and Invoice processing profiles.
- Direct URL submission (hidden when `urlOnly`).
- Error, success, pending, and uploading states.
- Sends the matching `category` field to the backend.

Backend APIs:

```text
POST /processing/upload/:datasetId   (multipart: file, processingProfile, category)
POST /processing/url/:datasetId      (json: url, processingProfile, category)
GET  /processing/dataset/:datasetId/documents
```

The frontend uses `src/lib/api/processing.ts` and the shared authenticated API client. It does
not call OCR providers or expose provider credentials.

## Upload Category Flow

`src/lib/api/processing.ts` declares `UploadCategory`
(`csv-excel | images | pdf | links | office | generic`). Each wrapper passes its category, which
is sent as a multipart field / JSON body field. The backend enforces the extension→category match
and stores `metadata.uploadCategory` on the `DocumentAsset` (see the backend
`.agents/skills/document-processing.md` § Upload Categories).

## Document Source List

`DocumentSourceList` is rendered below the Documents / Sources upload panel. It consumes:

```text
GET /processing/dataset/:datasetId/documents
```

It displays:

- Filename
- File type
- File size
- Created time
- Processing profile
- Uploaded/queued/processing/completed/failed/review status

The list polls while a source is `QUEUED`, `PREPROCESSING`, or `PROCESSING` and opens a protected
PDF/image preview through `GET /processing/document/:documentId/content`. The preview creates a
browser object URL from an authenticated blob response and revokes it when closed.

The list also attempts the authenticated SSE endpoint:

```text
GET /processing/document/:documentId/events
```

Polling remains the fallback for older deployments or unavailable event streams.

The list refreshes after a successful upload and has a manual Refresh action. Retry and extraction
review are intentionally not shown until their backend endpoints exist.

## Future UI

Future milestones will add:

- Document list and processing status.
- Protected PDF/image preview.
- Extraction review.
- Document View workbench mode.
- Segmentation inspection.
- Dataset analytics.

Do not redesign Field Configuration or Annotation mode while adding source upload.

## Verification

```text
cd annotation-platform-frontend
npm run build
npx tsc --noEmit
```
