# Frontend RAG — Annotation Integration

`annotation/annotation-questions.tsx` loads real configured fields from
`fieldSelectionAPI.getDatasetFieldConfig(datasetId)`. Empty → "No annotation questions
configured." + Add.

`annotation/add-question-dialog.tsx`:
- **Explicit only** — persists via `fieldSelectionAPI.saveDatasetFieldConfig` on the
  user-confirmed **Add** (appends a new annotation field to existing fields/labels/
  newColumns/fieldGroups). Cancel/duplicate → no mutation + inline error.
- Accepts an `initialQuestion` prefill opened from:
  - Related question card → "Add as Annotation Question"
  - RAG assistant low-confidence HITL → "Draft Question"

Shared intent flows through context `pendingQuestion`/`requestAddQuestion`/`clear`.
No silent schema mutation anywhere.