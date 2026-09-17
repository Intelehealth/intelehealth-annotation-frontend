# Review Consensus Validation Report

## Validation Date

2026-07-25

## Scope

This report covers the Review Consensus frontend route and its existing consensus workflow tests. It does not change or expand the approved Review Consensus product scope.

## Commands Run

```text
npm run build
npx tsc --noEmit
npx eslint "src/app/dataset/[datasetId]/consensus/page.tsx" --quiet
npx playwright test --config=playwright.existing.config.ts e2e/consensus-workflow.spec.ts
npx playwright test --config=playwright.existing.config.ts
LD_LIBRARY_PATH=/tmp/opencode/nspr/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH npm run test:e2e -- --grep "Review Consensus page"
```

The first Playwright run used the repository configuration and stopped before tests because it waited for `/` on port 3000 while the existing Next development server responds with 404 at that path. The source configuration was then corrected to wait for `/login`. The full 57-test comparison run used an ephemeral no-webserver configuration while that fix was being validated. The final focused run used the project configuration.

## Results

### Production Build

Passed.

The Review Consensus route compiled successfully:

```text
/dataset/[datasetId]/consensus
```

### Focused ESLint

Passed with `--quiet` for the Review Consensus route.

### TypeScript

The Review Consensus route introduced no TypeScript errors.

The full project type check still reports pre-existing errors in:

- `src/app/dashboard/page.tsx`
- `src/app/dataset/[datasetId]/statistics/page.tsx`
- `src/components/dataset-components/data-overview.tsx`

### Focused Consensus Playwright Suite

Passed: 5/5.

Passed coverage:

- Consensus debug contract.
- Consensus grid contract.
- Annotator progress contract.
- Consensus generation preservation.
- Review Consensus page rendering and row drawer UI.

The UI test was updated to assert the approved page surface:

- Total Rows.
- Review Requested.
- Annotator Progress.
- Consensus Table.
- Question.
- Annotator Answers.
- Document Preview.
- Approve.
- Review Again.

The test now reuses one cached admin session instead of logging in repeatedly through the backend rate limiter.

The final project-configured focused run also passed:

```text
1 passed
```

### Full Playwright Suite

The complete suite executed 57 tests after Chromium dependencies were made available through a temporary local library path.

Result:

- Passed: 12.
- Failed: 45.

The Review Consensus focused suite passed within this run. The remaining failures are outside this page:

- Six statistics tests time out during the existing login setup.
- CSV mapping tests repeatedly receive backend authentication rate-limit responses.
- Negative scenario tests repeatedly receive backend authentication rate-limit responses or fixture status mismatches.
- The existing login required-field test expects an HTML `required` attribute that the current login page does not render.
- The OAuth negative test currently receives HTTP 500 instead of the expected HTTP 401.

These failures are not caused by `src/app/dataset/[datasetId]/consensus/page.tsx`.

## Environment Blockers Resolved For Validation

The environment did not have system Chromium libraries installed. Playwright initially failed with missing:

- `libnspr4.so`
- `libnss3.so`
- `libasound.so.2`

System installation via `playwright install-deps` was unavailable because sudo requires an interactive password. The packages were downloaded and extracted to `/tmp/opencode` for this validation run only. No system packages or repository configuration were changed.

## Remaining Test Infrastructure Issues

- The Playwright readiness URL issue was fixed by changing the frontend readiness URL from `/` to `/login`.
- The backend test environment rate-limits repeated login requests during the full suite.
- Several existing tests expect backend status contracts that do not match the currently running backend.

## Review Consensus Status

The Review Consensus page is build-valid, focused UI-valid, and covered by a passing 5-test consensus suite. No additional Review Consensus functionality was added to compensate for unrelated suite failures.

## End-To-End Review Request Implementation

The subsequent implementation adds the row-level Review Request handoff while preserving the existing clone annotation storage path:

- Admin Review Again sends row, field, annotator, reason, comment, deadline, and timezone metadata.
- Review Request metadata is persisted on existing `ConsensusReview` records.
- Notifications include request and clone context.
- Annotator Tasks loads Review Requests.
- Notification clicks open the assigned clone annotation route.
- The existing Annotation Workbench loads request context and highlights the requested row.
- Requested fields are editable while non-requested fields are disabled.
- Submit Re-Annotation updates the existing clone annotation and marks the request `RE_SUBMITTED`.
- Soft deadlines allow late submission and record `submittedLate`.
- Collaborative Review is not exposed from the Admin Review Consensus UI; external discussion follows Review Again.
