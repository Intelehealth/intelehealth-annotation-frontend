# Review Consensus UI State Matrix

This matrix documents frontend states only. It does not introduce new UI or change the current Review Consensus workflow.

Annotator actions in the Admin Review Consensus page are always `None`. Annotators use the existing Tasks and Annotation Workbench routes for Review Requests.

| State | Visible components | Disabled buttons | Enabled buttons | Status badge / message | Admin actions | Annotator actions |
| --- | --- | --- | --- | --- | --- | --- |
| Loading | Existing shell, breadcrumb, header, summary skeletons, annotator skeletons, table skeleton | Row actions, modal actions, pagination | Refresh may show loading state | Loading rows and progress | None until data loads | None on this page |
| Empty | Existing shell, header, summary cards, toolbar, empty table state | Row actions and pagination | Refresh, Export if supported, Search, Filters | `No consensus rows found` | Search, filter, refresh | None on this page |
| No annotators | Existing shell, summary cards, progress section, toolbar, table state | Review Again participant submission, Collaborative Review creation | Refresh, Search, Filters, Export where data exists | `No annotators assigned` | Review dataset assignment outside this page | None on this page |
| No clone datasets | Existing shell, progress section, empty table or source context | Consensus row actions | Refresh, Search, Filters | `No clone datasets available` | Resolve assignment outside this page | None on this page |
| No completed annotations | Existing shell, annotator cards, table or empty table | Approve and Collaborative Review when no decision exists | Refresh, Search, Filters, Export | Pending badges; `No completed annotations` when applicable | Monitor pending rows | Annotate assigned clone tasks in existing Tasks route |
| Partial | Summary cards, annotator cards, table, row drawer | Approve until a valid final decision exists | Review Again when correction is needed, Export Row, Refresh | `Partial` | Inspect missing answers or request re-annotation | Submit missing or requested annotation in existing workbench |
| Conflict | Summary cards, annotator cards, table, row drawer | None unless no valid decision is available | Approve, Review Again, Start Collaborative Review, Export Row | `Conflict` | Compare answers and choose an approved decision | None on this page |
| Tie | Summary cards, annotator cards, table, row drawer | Approve until a final decision exists | Review Again, Start Collaborative Review, Export Row | `Tie` | Request re-annotation or start collaborative review | None on this page |
| Agreed | Summary cards, annotator cards, table, row drawer | None | Approve, Review Again, Start Collaborative Review where relevant, Export Row | `Agreed` | Approve or send back if an issue is found | None on this page |
| Approved | Summary cards, annotator cards, table, row drawer | Approve may be disabled or idempotent | Export Row; Review Again only if the product workflow reopens the row | `Approved` | Export or reopen through an approved workflow | None on this page |
| Review Requested | Summary cards, annotator cards, table, row drawer | Approve while waiting for requested submissions | Refresh, Review Again if clarification is required, Export Row | `Review Requested` | Wait for or resend a request | Open the request from Tasks and edit the requested row |
| Re-Submitted | Summary cards, annotator cards, table, row drawer | Approve until recalculation produces a valid decision | Refresh, Review Again, Export Row; Collaborative Review if unresolved | `Re-Submitted` until recalculation | Review the revised answer | Wait after submitting the revised answer |
| API Error | Existing shell, affected section error state, current unaffected data | Action tied to failed request | Retry, unaffected navigation, Search and Filters where data exists | Inline error message and Retry | Retry failed load or action | Retry existing task or annotation request |
| Forbidden | Existing shell if route guard renders it, access message | All Review Consensus actions | Return to permitted area | `You do not have permission to view Review Consensus` | None | Use existing annotator routes |
| Unauthorized | Login or existing auth redirect | All protected actions | Sign in | `Authentication required` | Sign in | Sign in |
| Dataset Missing | Existing shell or route error state | All dataset actions | Return to Datasets or retry | `Dataset not found` | Select an available dataset | None |

## State Priority

1. Unauthorized and Forbidden take priority over data states.
2. Dataset Missing takes priority over table and card states.
3. API Error is shown only for the affected data region when partial data is still usable.
4. Loading takes priority over Empty until the request completes.
5. Review Requested and Re-Submitted are row states, not page-level modes.

## State Transition Matrix

| Current state | Action | Next state | Actor |
| --- | --- | --- | --- |
| Pending | First annotator submits | Partial | System |
| Partial | Remaining annotators submit | Agreed, Conflict, or Tie | System |
| Agreed | Approve | Approved | Admin or Owner |
| Conflict | Review Again | Review Requested | Admin or Owner |
| Tie | Review Again | Review Requested | Admin or Owner |
| Tie | Start Collaborative Review | Under Collaborative Review | Admin or Owner |
| Review Requested | Annotator submits revision | Re-Submitted | Annotator |
| Re-Submitted | Consensus regenerates | Agreed, Conflict, Tie, or Partial | System |
| Under Collaborative Review | Final decision is recorded | Approved | Admin or Owner |
| Approved | Export report | Approved | Admin or Owner |
