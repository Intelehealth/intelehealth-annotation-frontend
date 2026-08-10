# Compliance Agents — URL Compliance & Diagnostics Agent

## Purpose
A diagnostic runbook + CLI that inspects **ANY** source URL (direct files, images,
PDFs, CSVs, office/zip, Google Drive / Dropbox / OneDrive / cloud links) and reports
the **specific problem** with that URL and how to fix it — before or after an upload
fails. Any URL that is not direct-file should be diagnosed rather than guessed.

> How to use: paste a URL; run the checks in order (or run the CLI
> `npx ts-node scripts/diagnose-url.ts "<url>"`). The first failing check tells the
> user exactly why this URL fails and the fix. If a re-upload fails again with the
> same URL, re-run the diagnosis and report the same reason (do not retry blindly).

---

## 1. URL ingestion decision tree (checks in order)
Each step either PASSES (continue) or prints the exact reason from the backend.

| # | Check | If it FAILS, the specific message (backend) |
|---|---|---|
| 1 | Is it a valid `http(s)` URL? | `Invalid source URL` / `Only HTTP and HTTPS source URLs are supported` |
| 2 | Host is public (not localhost)? | `Local source URLs are not allowed` (`localhost`, `127.0.0.1`, `::1`) |
| 3 | DNS resolves only to PUBLIC addresses? | `Private network source URLs are not allowed` (10.x, 192.168.x, 169.254.x, 172.16–31.x, fc00::/7, fd00::/7, fe80::/10) — SSRF guard |
| 4 | Host reachable (no timeout / refused)? | network error: `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND` (e.g. `@t timeout after 15s`, `@host Likely the file is gone or blocked`) |
| 5 | HTTP status is 2xx after ≤5 redirects? | non-2xx (403/404/401) or `maxRedirects exceeded` — e.g. Google Drive confirm page `text/html`, or expired signed URL `403` |
| 6 | Content-Length ≤ max size (50 MB default)? | `Remote source exceeds the maximum file size` (`DOCUMENT_MAX_SIZE_BYTES`) |
| 7 | Has a supported filename extension **or** content sniffable by magic bytes (`%PDF-`, PNG/JPEG/TIFF/BMP/WEBP sigs, PK-zip, `<svg`, CSV text)? | `Unsupported document extension: unknown` (pure HTML / no extension / `application/octet-stream` body that is not a known file) |
| 8 | Declared extension matches content signature? | `File content does not match its declared type` |
| 9 | Uploaded under a category that allows this type? | `File ".x" is not allowed for the "images" upload category ...` |
| 10 | Not a duplicate in the dataset? | `This document already exists in the dataset` (same checksum — re-uploaded identical file) |
| 11 | PDF page count ≤ max pages (1000)? | `Document exceeds the maximum page count of 1000` (`DOCUMENT_MAX_PAGES`) |

> Re-upload note: if a URL previously uploaded and you retry it, check #10 fires —
> the file already exists, so tell the user it's a **duplicate**, not a new failure.

---

## 2. Provider / cloud link rubric (document-only)

| Link type | Looks like | Likely behavior today | Specific fix |
|---|---|---|---|
| **Google Drive** | `drive.google.com/file/d/ABc.../view` or `/uc?id=...` | Returns an **HTML confirm page** (`text/html`) → #7 fails "unsupported extension"; or requires Google login (`401/403`). Adapter endpoint `POST /processing/google-drive/:id` is **reserved** (not wired). | Share as "Anyone with link", use **`&export=download`** on `/uc?id=` and even then often needs a cookie — **prefer exporting to a direct URL**; otherwise it will NOT work via the generic Links tab. |
| **Dropbox** | `dropbox.com/s/abc/file.pdf` | `?dl=0` = HTML preview page (#7 fail); raw may redirect. | Use **`?dl=1`** or **`raw=1`** replacement so it serves the file bytes directly. |
| **OneDrive / SharePoint** | `1drv.ms/...`, `sharepoint.com/.../download.aspx?cid=...` | Auth-gated; often `text/html` or `401`. | Provide a pre-signed/`download=1` share link or a direct blob URL. |
| **S3 / Azure / GCS pre-signed** | `...x-amz-signature=...&X-Amz-Expires=...` | Usually works IF it has a real extension (e.g. `/report.pdf?...`) or correct `Content-Type`. | Keep the signature params; the extension/mime is what matters for #7/#8. |
| **Plain direct file** | `https://cdn/x.pdf`, `https://host/image.png`, `....csv`, `....zip`, `....docx` | Works (after fixes). | None. |

**General rule for "any link, image, PDF, zip, doc, ppt":** the URL must ultimately return
a **file body**, not an HTML page or an auth wall. If it's a "browser/preview" link, convert
it to a **direct-download** link (`export=download`, `dl=1`, `raw=1`, `download=1`) before uploading.

---

## 3. Supported formats → preview behavior

| Format | Upload | Preview (frontend) | RAG / extraction |
|---|---|---|---|
| CSV | yes | inline table | yes (indexed from rows) |
| XLS / XLSX | yes | inline table (exceljs) / download | via dataset rows |
| PDF | yes | iframe | yes — **native-text only**; scanned PDF → empty text (OCR is a stub) |
| PNG/JPG/JPEG/TIFF/BMP/WEBP | yes | `<img>` (+zoom in workbench) | via vision / extraction text |
| SVG | yes | `<img>` | yes |
| DOC/DOCX | yes | download link | yes (extracted text) |
| PPT/PPTX | yes | download link | yes (extracted text) |
| ODT/ODP | yes | download link | yes (extracted text) |
| ZIP | yes | download (extracted assets) | per-asset |

**Extraction expectations to report:**
- Scanned/image-only PDF → text extraction returns empty → tell user "this PDF has no text layer; OCR is not configured" (`RAG`/extraction will show low/empty).
- Images → depend on vision provider (`DOCUMENT_VISION_PROVIDER`) for text extraction.

---

## 4. Diagnostic output template (print exactly for a URL)
```
URL   : <the url>
VERDICT: [PASS]  or  [FAIL]
REASON: <specific cause, e.g. "Server returned text/html (no file extension -> Unsupported document extension: unknown)">
FIX   : <one concrete fix, e.g. "Use Dropbox ?dl=1 to serve the raw file">
STEP  : <which decision-tree check failed, 1–11>
```

---

## 5. Implemented fixes (done)
BACKEND (`annotation-platform-backend`):
- [x] `src/processing/document-source.util.ts` — magic-byte sniffer (`detectSourceTypeFromContent` + `EXTENSION_BY_TYPE`).
- [x] `src/processing/document-source.service.ts` — derive type from content when extension missing / `octet-stream`; store corrected filename + mime.
- [x] `src/rag/rag-indexer.service.ts` — index CSV/spreadsheet-backed assets via `DatasetRow` even if not `status:COMPLETED`.
- [x] `scripts/diagnose-url.ts` — CLI that runs the safe checks and prints PASS/FAIL + reason + fix.

FRONTEND (`annotation-platform-frontend`):
- [x] `src/components/upload-components/document-source-preview.tsx` — MIME-aware renderer (CSV inline table, PDF iframe, image, office/zip download).
- [x] `src/components/upload-components/document-source-list.tsx` — correct type/mime stored at ingest (chips correct automatically).

## Verification
- Backend: `npx tsc --noEmit -p tsconfig.build.json` (specs excluded).
- Frontend: `npx tsc --noEmit`.
- CLI: `npx ts-node scripts/diagnose-url.ts "<url>"` for sample URLs (pdf, no-extension CDN, Google Drive, csv, jpg).

## Live verified results (CLI, real URLs)
The CLI was run against real public URLs; the output for each is the exact behavior the agent prints:

| Case | URL | Agent verdict |
|---|---|---|
| PDF | `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` | `[PASS]` → PDF (iframe) |
| PNG | `https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png` | `[PASS]` → IMAGE |
| no-extension PNG | `https://dummyimage.com/600x400/134/fff` | `[PASS]` → IMAGE (sniffed `image/png`, no `.png` in URL) |
| CSV (ext) | `https://raw.githubusercontent.com/datasets/covid-19/main/data/countries-aggregated.csv` | `[PASS]` → CSV (server sent `text/plain`; URL `.csv` ext; bytes sniff rescued) |
| ZIP | `https://github.com/expressjs/express/archive/refs/heads/master.zip` | `[PASS]` → ZIP (200 `application/zip`, follows redirect) |
| Google Drive (nonexistent) | `https://drive.google.com/file/d/1faketestabc123/view` | `[FAIL]` step 5 → HTTP 404 "file not found" |
| DOCX (hotlink-protected) | `https://download.samplelib.com/docx/sample-docx-file-for-testing.docx` | `[FAIL]` step 5 → HTTP 403 "auth/permission wall" |
| localhost / private | `http://localhost:4000/report.pdf` | `[FAIL]` step 2 → "Local source URLs are not allowed" |

**Reading the results:**
- Genuine direct-file URLs (pdf/png/csv/zip/doc/ppt/office) → `[PASS]`, classified for preview.
- No-extension URLs are rescued by **magic-byte sniffing** (backend `detectSourceTypeFromContent`) so extension-less/CDN files work.
- URLs that are not a direct file (HTML preview, auth walls, 404s, private hosts) are **never silently passed** — the agent prints the exact failing step + a concrete fix (e.g. Drive `&export=download`, Dropbox `?dl=1`/`raw=1`, make file public).
- A real public Google Drive file returns an HTML confirm page → step 7 "web page, not a file"; a deleted/nonexistent one returns 404 → step 5. Both diagnosed.

> "Whatever URL should work" = any direct file URL works. Non-file URLs (browser previews,
> login walls, broken links, private hosts) cannot be force-imported; the agent reports
> precisely why and how to make them importable, and flags re-uploads as duplicates (step 10).

## Compliance checklist
- [ ] Any URL analyzed end-to-end; the specific failing check is printed (1–11)
- [ ] Drive/Dropbox/OneDrive links diagnosed with the correct reason + direct-download fix
- [ ] All formats upload + preview (table/iframe/image/download-link)
- [ ] Re-upload of an existing file reported as duplicate, not a new error
- [ ] Native-text PDF/indexed; scanned PDF reported as no-text-layer
- [ ] `npx tsc --noEmit` (frontend) and backend build pass
