# Links / URLs Upload

## Status

Implemented as part of the per-category upload UI (Phase 1). This is the `links` tab in
`DatasetUploadComponent`.

## Component

`src/components/upload-components/url-upload-component.tsx` is a thin wrapper around
`MultiSourceUploadComponent` configured with:

- `urlOnly = true` (Local-files tab hidden; only the Direct-URL panel is shown)
- `category = "links"`

## Backend

```text
POST /processing/url/:datasetId   (json: url, processingProfile, category=links)
```

The `links` category accepts any supported remote/URL source. Private network URLs are blocked by
`assertSafeRemoteUrl` in `document-source.service.ts`.

## Category Scope

- Any supported PDF / image / office remote URL.

## Notes

- Direct PDF/image/office URLs are supported.
- The URL is fetched, signature-validated, checksummed, and stored as a `DocumentAsset`.
