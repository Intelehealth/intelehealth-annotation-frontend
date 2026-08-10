# CSV / Excel Upload

## Status

Implemented as part of the per-category upload UI (Phase 1). This is the `tabular` tab in
`DatasetUploadComponent`.

## Component

`src/components/upload-components/csv-upload-component.tsx` — the legacy tabular-data workflow.
Preserve its preview, header validation, schema synchronization, and redirect behavior.

## Backend

Tabular files are uploaded through the shared processing endpoint:

```text
POST /processing/upload/:datasetId   (multipart: file, processingProfile, category)
```

`category = "csv-excel"`, which the backend validates against `.csv`, `.xls`, `.xlsx`.

## Category Extensions

- `.csv`
- `.xls`
- `.xlsx`

Backend enforcement lives in `src/processing/document-source.util.ts`
(`UPLOAD_CATEGORY_EXTENSIONS['csv-excel']`).

## Notes

- Max size and encoding rules are defined in the upload UI copy.
- Do not redirect or change CSVUploadComponent behavior without reading its full implementation.
