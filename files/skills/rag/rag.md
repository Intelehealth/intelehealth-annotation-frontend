# RAG — Source of Truth (Frontend)

Read this before modifying the Document Intelligence UI / RAG client.

## Purpose
Two-panel "Document Intelligence" workspace mounted in the annotation workbench's
**Document View** mode: LEFT = Document Hub (searchable list ⇄ real preview), RIGHT =
Intelligence Hub (Annotation Questions · Related Questions · RAG Assistant · Model
Settings · Field Coverage). **No fabricated data** — every shown value comes from the
backend RAG/processing APIs; unavailable → explicit empty/unavailable states.

## Entry / mounting
`dataset-annotation-workbench.tsx` renders, when `viewMode === 'document-view'`:
`<DocumentViewProvider datasetId><DocumentIntelligencePage/></DocumentViewProvider>`.
Annotation mode + `MetadataDisplay`/`NewColumnDataPanel`/`RowFooter` remain unchanged.

## Shared state
`components/document-intelligence/context/document-view-context.tsx` holds:
datasetId, documents, ragStatus, selectedDocumentId, currentPage, zoom, focusedCitation +
`citationPulse`, selectedModel, chatMessages, pendingQuestion (`requestAddQuestion`).
Cross-panel sync (citations, model, chat) flows through this context.

## Non-negotiables
- No mock/fake/dummy/hardcoded values; no fabricated questions/citations/coverage.
- Citations open the real document/page in the left preview; missing doc → honest notice.
- Adding an annotation question is always explicit (user-confirmed Add).

See `layout`, `document-preview`, `annotation`, `chatbot`, `citations`, `api`, `testing`
sub-docs.