# Office / Other Upload

## Status

Implemented as part of the per-category upload UI (Phase 1). This is the `other` tab in
`DatasetUploadComponent`.

## Component

`src/components/upload-components/office-upload-component.tsx` is a thin wrapper around
`MultiSourceUploadComponent` configured with:

- `acceptedExtensions = [.doc, .docx, .odt, .odp, .pptx, .zip]`
- `category = "office"`
- `allowUrl = true` (Direct URL tab available)

## Backend

```text
POST /processing/upload/:datasetId   (multipart: file, processingProfile, category=office)
POST /processing/url/:datasetId      (json: url, processingProfile, category=office)
```

## Category Extensions

- `.doc`, `.docx`, `.odt`, `.odp`, `.pptx`, `.zip`

## Notes

- ZIP-family containers (DOCX/PPTX/ODT/ODP/ZIP) are validated as PK signatures.
- Legacy OLE containers (DOC) are validated separately.
