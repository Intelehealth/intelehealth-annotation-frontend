# Review Consensus Frontend State Management

This document describes ownership and transitions only. It does not prescribe new implementation.

| State | Owner | Initial state | Updated by | Visible effect |
| --- | --- | --- | --- | --- |
| Loading | `ReviewConsensusPage` | `true` | Initial grid/progress request | Skeletons replace data regions |
| Refreshing | `ReviewConsensusPage` | `false` | Refresh or sync action | Refresh control shows spinner/disabled state |
| Searching | `Toolbar` controlled by page | Empty query | Search input | Visible rows are filtered |
| Filtering | `Toolbar` controlled by page | Empty filters | Status, agreement, annotator, needs-review controls | Visible rows are filtered |
| Pagination | Page data coordinator | Page 1 | Page controls and filter changes | Current page and totals update |
| Selected Row | Page coordinator | `null` | Row click or Review action | Drawer target changes |
| Drawer Open | Page coordinator | `false` | Open row, close button, outside click, Escape | Row drawer appears or closes |
| Modal Open | Page coordinator | No modal | Review Again or Collaborative Review actions | One workflow modal appears |
| Notification Preview | `ReviewAgainModal` | Derived from current form | Reason, comment, selected row, deadline changes | Preview reflects the exact request content |
| Collaborative Review Modal | `CollaborativeReviewModal` | Closed | Open action, title/topic input, cancel, create | Session form appears and submits |

## Data State Ownership

- `rows` owns normalized consensus rows returned by the grid.
- `progress` owns annotator and summary progress returned by the progress endpoint.
- `datasetName` owns the current dataset label.
- Derived filtered rows are computed from `rows` and toolbar state.
- Modal form state is local to its modal until submission.
- API success updates page data or closes the relevant workflow surface.
- API failure preserves the active form where possible and shows an error state or toast.

## State Rules

- Search and filters do not mutate backend data.
- Refresh reloads grid and progress data.
- Pagination preserves filters and search; changing filters resets to page 1.
- Opening a new row closes the previous drawer target.
- Only one row drawer or workflow modal should be active at a time.
- Review Again cannot submit without a comment, deadline, row, and selected annotator.
- Collaborative Review cannot submit without participants and a meeting title.
- Successful Review Again changes the visible row to Review Requested.
- Successful approval changes the visible row to Approved.
