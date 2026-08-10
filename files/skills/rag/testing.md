# Frontend RAG — Testing

Verification command:
```
npx tsc --noEmit -p tsconfig.json
```
Manual (with a running backend + indexed dataset): open a dataset in Document View →
document list from `/rag/datasets/:id/documents`; select → correct preview per format
(pdf.js page nav, image, SVG, CSV table, XLSX sheets, ZIP archive); Right sections reflect
real state:
- Annotation Questions from config; "Add as Annotation Question" (explicit) persists.
- Related Questions "Generate from documents" → real cited/coverage-scored questions.
- RAG Assistant: status rail, model dropdown (available only), chat with citations,
  low-confidence HITL (Retry/Draft), `/query` + quick replies, history restore.
- Model Settings saves dataset + user preference.
- Field Coverage emerald bars with real numbers.
- Click any citation/source → left preview opens the document (and page for PDF) with a
  pulse; CSV scrolls to the cited row when rowIndex present.

No mock/fake data anywhere; empty/unavailable states shown honestly.