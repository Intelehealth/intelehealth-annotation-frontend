# Frontend RAG — Document Preview

`preview/document-preview.tsx` dispatches by real `mimeType`/fileName to format renderers
(content via `processingAPI.getDocumentContent(document.id)`):

| Kind | Renderer | Behavior |
|---|---|---|
| PDF | `pdf-preview.tsx` (pdfjs-dist 4) | page nav, zoom, fit, loading/error; citation→page |
| Image | `image-preview.tsx` | original `<img>` + zoom |
| SVG | `svg-preview.tsx` | original; unrenderable → "Preview unavailable — original available" |
| CSV | `csv-table-preview.tsx` | real rows → sticky/search/paginated table + `focusRow` scroll |
| XLS/XLSX | `spreadsheet-preview.tsx` (exceljs) | sheet tabs + paginated table |
| ZIP | `zip-preview.tsx` | original archive + download (real; no fabricated file list) |
| other | `unsupported-preview.tsx` | download original |

Citation sync (`citationPulse`/`focusRow`) renders a 2s emerald ring and scrolls CSV to the
cited row when coordinates exist. Never reconstructs/fabricates previews.