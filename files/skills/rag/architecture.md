# Frontend RAG — Architecture

Component tree under `src/components/document-intelligence/`:

```
document-intelligence-page.tsx        ← assembles header + two columns
context/document-view-context.tsx     ← shared state (selection, citation, model, chat)
layout/left-document-panel.tsx        ← list ⇄ preview
layout/right-intelligence-panel.tsx   ← collapsible sections
layout/collapsible-section.tsx
documents/    search · list · list-item · status (INDEXED/READY/PROCESSING/FAILED)
preview/      document-preview dispatcher + pdf/image/svg/csv/spreadsheet/zip/unsupported
annotation/   annotation-questions · add-question-dialog
related/      related-questions · related-question-card
rag/          rag-assistant · chat-thread/message · citation-chip · confidence-indicator
              low-confidence-panel · chat-composer · model-settings
coverage/     field-coverage
```

Data flow: `ragAPI` (src/lib/api/rag.ts) + `workspacesAPI` (workspaces.ts) call backend;
`processingAPI` serves document binary/rows for preview. Annotation config via
`fieldSelectionAPI`. Emerald `#10B981` palette for actions/progress/status.