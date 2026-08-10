# Frontend RAG — Chatbot (expandable assistant)

`rag/rag-assistant.tsx` — a `CollapsibleSection`.

**Status rail:** real `Indexed: N docs · M chunks · RAG: READY/NOT READY` from
`ragAPI.status`, plus a **model dropdown** (from `ragAPI.models`, available only) that
persists to the dataset via `ragAPI.saveDatasetSettings`, and a Re-index button.

**Thread** (`chat-thread`/`chat-message`): user/assistant bubbles; assistant shows
**citation chips** (`citation-chip`) → open the cited doc/page; **confidence indicator**.

**Send:** `ragAPI.orchestrate({datasetId, question, model})` → append real answer +
citations + confidence. Absent info → honest "I couldn't find that information…";
errors → explicit message (no fabricated answer).

**HITL low-confidence strip** (`low-confidence-panel`) when `lowConfidence`: Retry /
Don't use / Draft Question (Draft opens the explicit add-question dialog).

**Composer** (`chat-composer`): `/query` placeholder + quick-reply chips; history restored
via `ragAPI.getConversation`.

`rag/model-settings.tsx` (admin) persists dataset model + own user preference via PATCH.