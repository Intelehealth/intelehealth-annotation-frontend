# Frontend RAG — Layout (two-panel)

```
HEADER: Dataset name + document count
┌── LEFT: DOCUMENT HUB ──────────────┬── RIGHT: INTELLIGENCE HUB ─────────────┐
│  (list ⇄ preview states)           │  ▾ Annotation Questions                │
│  Search · All|PDF|Images|Tables    │  ▾ Related Questions                   │
│  [status chips + profile badge]    │  ▾ RAG Assistant  (collapsible)        │
│  → click → PREVIEW in-panel:       │  ▾ Model Settings (collapsed)          │
│    PDF.js page/zoom · image · svg ·│  ▾ Field Coverage                      │
│    csv table · spreadsheet · zip   │  (each section independently collapsible)│
└────────────────────────────────────┴────────────────────────────────────────┘
```
LEFT has two states — **Document list** and **Preview** (back "← Documents" restores the
list; preview stays in-panel, never a separate route). RIGHT sections are independently
collapsible via `CollapsibleSection`.

RAG Assistant expandable states: **collapsed** (status summary) → **expanded** (status
rail + model dropdown, chat thread, HITL low-confidence strip, composer with `/query` +
quick replies).