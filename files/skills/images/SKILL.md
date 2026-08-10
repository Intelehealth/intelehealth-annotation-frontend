# Images Upload

## Status

Implemented as part of the per-category upload UI (Phase 1). This is the `images` tab in
`DatasetUploadComponent`.

## Component

`src/components/upload-components/image-upload-component.tsx` is a thin wrapper around
`MultiSourceUploadComponent` configured with:

- `acceptedExtensions = [.png, .jpg, .jpeg, .webp, .bmp, .tif, .tiff, .svg]`
- `category = "images"`
- `allowUrl = true` (Direct URL tab available)

## Backend

```text
POST /processing/upload/:datasetId   (multipart: file, processingProfile, category=images)
POST /processing/url/:datasetId      (json: url, processingProfile, category=images)
```

The backend rejects files whose extension is not an image when `category=images` is sent.

## Category Extensions

- `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tif`, `.tiff`, `.svg`

## Notes

- SVG is treated as an image category extension.
- Uploaded document assets appear in `DocumentSourceList` below the panel.
