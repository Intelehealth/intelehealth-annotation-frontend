# Frontend RAG — Citations & Synchronization

- **CitationFocus** (context): `{ documentId, documentName, page, rowIndex, column }`.
- `openCitation` sets `selectedDocumentId` + `currentPage` + bumps `citationPulse`.
- RAG assistant maps citation `fileName → documentId`; if the file isn't in the loaded
  list it shows an honest notice (never silent fail).
- Related-question cards pass `rowIndex` through citations.
- LEFT preview listens for `citationPulse` (2s emerald ring) and `focusRow` (CSV scroll).
- Page navigation applies to PDF only; image/SVG/CSV/zip ignore `page` (no fake nav).
- Highlight clears on the next user chat action.

Combined with the backend's real citations (`{fileName, page, chunkId, documentId}`),
clicking a citation or source opens the correct document/page in the left panel.