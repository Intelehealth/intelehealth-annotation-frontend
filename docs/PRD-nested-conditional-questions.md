---
title: "PRD — Nested / Conditional Questions for Annotation Field Configuration"
subtitle: "Conditional visibility, sub-questions, and branching logic for the annotation platform"
author: "Product / Engineering"
date: "2026-06-28"
status: "Draft v1 — for review"
---

# 1. Overview

## 1.1 Summary
Enable admins to build **conditional / nested questions** when configuring a dataset's
annotation fields: a question (the *parent*) can reveal one or more **sub-questions** (the
*children*) depending on the annotator's answer. For example, answering `Has finding? = Yes`
reveals `Finding type`, `Severity`, and `Notes`; answering `No` keeps them hidden.

This makes annotation forms shorter, less error-prone, and able to model real clinical/decision
workflows ("if abnormal → ask which abnormality → ask grade").

## 1.2 Problem statement
The platform's field configuration is **flat**: every configured field is always shown to every
annotator. There is no supported way to ask follow-up questions based on a prior answer.

A partial foundation already exists but is **not usable end-to-end**:

- A `VisibilityRule` type exists (`src/types/feature1.ts:279-283`) and a runtime evaluator
  `isFieldVisible()` exists (`src/components/new-column-components/new-column-data-panel.tsx:603-616`).
- **But there is no admin UI to author rules**, no true parent→children grouping, no multi-level
  chains, and consensus/export ignore visibility entirely.

So today a conditional question can only be created by hand-editing the API/database — not a real
feature.

## 1.3 Goals
1. Admins can create conditional logic **entirely through the field-config UI** — no code/DB edits.
2. A parent question can reveal **a single sub-question or a group of sub-questions**.
3. Support **multi-level nesting** (a sub-question can itself have sub-questions) to a sane depth.
4. Annotators see sub-questions appear/disappear **instantly and clearly** (visual hierarchy).
5. Consensus, progress, and CSV export correctly account for conditionally-hidden fields.

## 1.4 Non-goals (v1)
- Cross-row or cross-dataset conditions (a rule referencing another row's answer).
- Formula/expression language beyond the supported operators (no arithmetic, no AND/OR trees in v1 — see §7 Open Questions for v2).
- Conditional logic driven by metadata/source CSV columns (only by annotation answers in v1).
- Migrating existing datasets' flat configs (they keep working unchanged).

---

# 2. Background — Current State (grounded in code)

| Capability | Status | Reference |
|---|---|---|
| `VisibilityRule { dependsOn, operator, value }` | Defined | `types/feature1.ts:279-283` |
| Operators: equals, not_equals, contains, empty, not_empty | Defined + evaluated | `types/feature1.ts:281`; `new-column-data-panel.tsx:608-614` |
| `visibilityRule` on a child field | Defined | `types/feature1.ts:313` |
| Runtime show/hide in annotation panel | Implemented (single panel) | `new-column-data-panel.tsx:748` (`if (!isFieldVisible(field)) return null;`) |
| Admin authoring UI for rules | **Missing** | none in `field-config.tsx`, `field-type-configurator.tsx`, `field-group-editor.tsx` |
| Group-level conditions (`FieldGroup.visibilityRule`) | **Missing** | `types/feature1.ts:316-327` (no rule field) |
| Multi-level cascading (hidden parent → hide descendants) | **Missing** | `isFieldVisible` evaluates against raw form state only |
| Workbench parity (both annotation screens) | **Partial** | only `new-column-data-panel` evaluates rules; workbenches don't uniformly |
| Consensus/progress/export ignore hidden fields | **Missing** | `consensus/page.tsx:270-296` shows all fieldReviews |

**Implication:** We are extending an existing partial model, not building from zero. Reuse
`VisibilityRule` and `isFieldVisible` rather than inventing new primitives.

---

# 3. User Stories

**Admin (form author)**
- As an admin, I can mark a question as "conditional on another question's answer" and pick the
  trigger field, operator, and value.
- As an admin, I can attach **multiple sub-questions** to a trigger as a unit (a conditional group).
- As an admin, I can nest a sub-question under another sub-question (≥2 levels).
- As an admin, I get a **live preview** of how the form behaves before saving.
- As an admin, I'm warned if I create an invalid rule (e.g. depends on a deleted field, a cycle,
  or a value not in the trigger's options).

**Annotator (form filler)**
- As an annotator, sub-questions appear immediately when I select the triggering answer, indented
  under their parent so the relationship is obvious.
- As an annotator, when I change an answer so a sub-question is hidden, its previously-entered
  value does not silently pollute results.
- As an annotator, required sub-questions only block submission **when they are visible**.

**Admin (reviewer)**
- As a reviewer, consensus and exports do not flag hidden/never-shown fields as disagreements or
  empty errors.

---

# 4. Functional Requirements

## 4.1 Data model
Extend the existing types (`src/types/feature1.ts`). Reuse `VisibilityRule`; add group-level
support and an optional condition group.

```ts
// Reused as-is (v1):
export interface VisibilityRule {
  dependsOn: string;                       // fieldName of the trigger
  operator: 'equals' | 'not_equals' | 'contains' | 'empty' | 'not_empty';
  value: string;
}

// NEW — allow a whole repeatable/visual group to be conditional:
export interface FieldGroup {
  // ...existing...
  visibilityRule?: VisibilityRule;         // NEW: hide/show the entire group
}

// NEW (optional, enables "reveal several questions as a unit" without a repeatable group):
export interface ConditionalGroup {
  groupId: string;
  triggerRule: VisibilityRule;             // when true, children are shown
  childFieldNames: string[];               // ordered sub-questions revealed together
  title?: string;
}
```

- **Backward compatible:** existing flat configs have no rules → always visible (current behavior).
- `dependsOn` references a `fieldName`; sub-questions reference their parent's `fieldName`.
- **Depth:** support nesting to a configurable max (default **3 levels**) to keep UX/eval bounded.

## 4.2 Admin authoring UI (the main gap)
Add a **"Conditional logic"** section to each field card in the field configurator
(`field-config.tsx` + `field-type-configurator.tsx`; for grouped fields, `field-group-editor.tsx`).

Per field, the admin can:
1. Toggle **"Only show this question when…"**.
2. Pick **trigger field** (`dependsOn`) — dropdown of *eligible* fields only (fields defined
   earlier; same scope; not itself; not a descendant — prevents cycles).
3. Pick **operator** (the 5 supported), with operator set filtered by trigger type
   (e.g. select/radio → equals/not_equals; text → contains/empty/not_empty).
4. Pick/enter **value**:
   - If trigger is select/radio/multiselect → **dropdown of that field's options** (no free-text).
   - Else → text input.
5. Optionally **"Add sub-question"** directly under a question (creates a child and pre-fills its
   `dependsOn` = this field), enabling tree authoring rather than manual rule entry.

Provide a **"Group sub-questions"** action to attach several existing fields to one trigger
(creates a `ConditionalGroup`).

**Validation (block save):**
- No dangling `dependsOn` (must reference an existing field).
- No cycles (A→B→A) — detect via graph check.
- `value` must be one of the trigger's options when the trigger is a closed-choice type.
- Nesting depth ≤ max.

## 4.3 Live preview
A **Preview** toggle in the configurator renders the form using the real runtime evaluator
(`isFieldVisible`) against scratch state, so admins can click through answers and see
sub-questions reveal/hide before saving. Reuse the annotator render path, not a separate mock.

## 4.4 Annotator runtime
Generalize and harden the existing evaluator:
1. **Cascading visibility:** a field is visible only if its own rule passes **and** its parent
   chain is visible. If a parent is hidden, all descendants are hidden regardless of their own
   rule. (Today `isFieldVisible` checks only the field's own rule.)
2. **Apply everywhere:** the same evaluation must run in **both** annotation surfaces
   (`new-column-data-panel.tsx` and the workbenches `annotation-workbench.tsx` /
   `dataset-annotation-workbench.tsx`) — extract a shared `evaluateVisibility(config, answers)`
   helper in `src/lib/` so behavior is identical (also aligns with the architecture review's
   de-duplication goal).
3. **Visual hierarchy:** visible sub-questions render **indented/nested** under their parent
   (e.g. left border + padding), and a conditional group renders as a titled, indented block.
4. **Hidden-value policy (decision required, see §7):** default v1 = **clear/omit hidden answers
   on save** so hidden fields never contribute values. Preserve in local UI state for the session
   so toggling back restores the entry, but exclude from the saved payload.

## 4.5 Validation & submission
- Required validation only applies to **currently-visible** fields.
- Progress (`.../progress`) counts only visible-required fields as "to complete".
- Submission is blocked only if a **visible** required field is empty.

## 4.6 Consensus, progress & export
- **Consensus:** rows where a field was hidden for an annotator should treat that field as
  "not applicable" for that annotator rather than an empty disagreement
  (`consensus/page.tsx` + backend consensus generation).
- **Export:** hidden fields export as a defined sentinel (e.g. empty / `N/A`), consistently, and
  documented. No spurious columns.

## 4.7 Backend (coordination)
This is a frontend repo, but the feature requires backend support:
- Persist `visibilityRule` on fields and groups + `ConditionalGroup` in the field-selection
  schema (`POST /field-selection`).
- Consensus generation must skip fields hidden for a given annotator.
- Export must honor the hidden-value policy.
A companion backend ticket is required; see §8 Rollout.

---

# 5. UX / Design Notes

- **Authoring:** condition editor is a collapsible sub-panel on the field card ("Add condition")
  to avoid bloating the already-large field configurator. "Add sub-question" is the primary,
  low-friction path; raw rule entry is the advanced path.
- **Annotator:** indentation + a subtle connector/border to signal parent→child. Animate
  reveal/hide (respect `prefers-reduced-motion`). Keep keyboard navigation working across
  dynamically inserted fields.
- **Empty trigger states:** if the trigger has no answer yet, dependent fields stay hidden
  (operators `empty`/`not_empty` excepted).

---

# 6. Edge Cases
1. **Cycles** — A depends on B, B depends on A → blocked at authoring.
2. **Deleted trigger** — deleting a field that others depend on → warn and offer to remove
   dependent rules or block deletion.
3. **Option renamed/removed** — a rule's `value` no longer matches trigger options → flag stale
   rule at authoring; at runtime, treat as never-matching (field hidden) and surface a config
   warning to admins.
4. **Multiselect/contains** — define semantics: `contains` matches if the selected set includes
   the value (decision §7).
5. **Repeatable groups** — a child's `dependsOn` resolves **within the same group instance**, not
   across instances (must be scoped per instance index).
6. **Hidden-then-shown** — re-showing a field restores session value (per §4.4) but the saved
   payload reflects only the final visible state.
7. **Deep nesting performance** — cap depth; evaluation is O(fields) per render via memoized
   selector.

---

# 7. Open Questions (need product decision)
1. **Hidden-value policy:** clear on save (recommended) vs retain-but-mark-hidden vs keep value?
2. **Boolean logic:** v1 single condition per field. Do we need AND/OR of multiple conditions
   (v2)? If yes, design the editor for it now.
3. **`contains` for multiselect:** membership vs substring on the joined string.
4. **Max nesting depth:** propose 3. Acceptable?
5. **Trigger sources:** answers only (v1), or also source CSV/metadata columns?
6. **Conditional repeatable groups:** allow a group's `repeatCount` itself to be conditional?

---

# 8. Rollout / Phasing

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0 — Foundation** | Extract shared `evaluateVisibility()` lib; add cascading; apply in all annotation surfaces; backend persists rules | Same behavior as today but unified + cascading + persisted |
| **P1 — Authoring UI** | Condition editor + "Add sub-question" + validation + live preview | Admin can build a 2-level conditional form fully via UI |
| **P2 — Groups & nesting** | `ConditionalGroup`, group-level rules, depth ≤ 3, visual nesting | Reveal-a-group works; nested sub-questions render indented |
| **P3 — Consensus/export** | Hidden-field handling in consensus, progress, export | No false disagreements; exports consistent |

Feature-flag the authoring UI until P3 lands so partially-built forms can't reach annotators.

---

# 9. Acceptance Criteria (v1 = P0–P3)
1. An admin can, **using only the UI**, create a question that reveals ≥1 sub-question based on a
   prior answer, and nest at least 2 levels.
2. Annotators see sub-questions reveal/hide instantly, visually nested, in **both** annotation
   surfaces.
3. Hidden required fields never block submission; visible required fields do.
4. Cyclic/dangling/invalid rules are blocked at authoring with clear messaging.
5. Consensus does not report hidden fields as disagreements; export handles them consistently.
6. Existing flat datasets are unaffected (regression-free).

---

# 10. Risks & Mitigations
- **No test suite / build masks errors** (per architecture review) → add unit tests for
  `evaluateVisibility()` and cycle detection as part of P0; this is the highest-leverage safety net.
- **Workbench duplication** → P0's shared evaluator must be used by both workbenches to avoid a
  third divergent copy.
- **Scope creep into a rules engine** → keep v1 to single-condition rules; defer boolean trees.

---

# 11. Success Metrics
- % of new datasets using ≥1 conditional question (adoption).
- Reduction in annotator time-per-row on forms with optional sections.
- Reduction in "not applicable / left blank" disagreements in consensus.

---

# 12. Appendix — Key files to touch
- Types: `src/types/feature1.ts` (`VisibilityRule`, `FieldGroup`, new `ConditionalGroup`)
- Authoring: `src/components/field-config-components/field-config.tsx`,
  `field-type-configurator.tsx`, `field-group-editor.tsx`
- Runtime: new `src/lib/visibility.ts` (`evaluateVisibility`); consumed by
  `src/components/new-column-components/new-column-data-panel.tsx`,
  `src/components/annotation-components/annotation-workbench.tsx`,
  `dataset-annotation-workbench.tsx`
- Consensus/export: `src/app/dataset/[datasetId]/consensus/page.tsx`,
  `src/lib/dataset-export-helper.ts`, `src/lib/csv-export-helper.ts`
- API: `src/lib/api/field-config.ts` (persist rules)
