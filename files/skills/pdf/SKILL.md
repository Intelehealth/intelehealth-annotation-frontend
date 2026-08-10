# PDF Upload

## Status

Implemented as part of the per-category upload UI (Phase 1). This is the `pdf` tab in
`DatasetUploadComponent`.

## Component

`src/components/upload-components/pdf-upload-component.tsx` is a thin wrapper around
`MultiSourceUploadComponent` configured with:

- `acceptedExtensions = [.pdf]`
- `category = "pdf"`
- `allowUrl = true` (Direct URL tab available)

## Backend

```text
POST /processing/upload/:datasetId   (multipart: file, processingProfile, category=pdf)
POST /processing/url/:datasetId      (json: url, processingProfile, category=pdf)
```

The backend rejects non-PDF uploads when `category=pdf` is sent.

## Category Extensions

- `.pdf`

## Notes

- Uploaded document assets appear in `DocumentSourceList` below the panel and support protected
  PDF preview via `GET /processing/document/:documentId/content`.
