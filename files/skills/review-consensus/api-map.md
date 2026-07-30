# Review Consensus Frontend API Mapping

This table maps current UI surfaces to existing platform API methods. Labels such as `GET Consensus` and `POST Review Again` are workflow names, not new endpoint requirements.

| UI surface | Workflow operation | Existing frontend method | Expected response/use |
| --- | --- | --- | --- |
| Dataset header and breadcrumb | Load dataset context | `datasetsAPI.getById(datasetId)` | Dataset name and context labels |
| Summary Cards | Get consensus totals and status counts | `consensusAPI.getProgress(datasetId)` plus grid metadata | Total rows, Agreed, Conflict, Tie, Partial, Review Requested, progress |
| Annotator Cards | Get assigned/completed/pending progress | `consensusAPI.getProgress(datasetId)` | One through nine annotator progress records |
| Consensus Table | Get consensus rows | `consensusAPI.getConsensusGrid(datasetId, params)` | Rows, answers, winner, agreement, status, pagination metadata |
| Search | Search current consensus rows | Grid `search` parameter where supported; current loaded-row filtering | Filtered table/card view |
| Filters | Filter consensus rows | Grid `status`, `search`, and supported filter parameters; current loaded-row filtering | Filtered table/card view |
| Refresh | Reload consensus data | `getConsensusGrid()` and `getProgress()` | Updated page data |
| Export | Export dataset consensus | `consensusAPI.exportCsv(datasetId, 'audit')` or existing export type | Browser download |
| Row Details Drawer | Read selected row details | Uses row data already returned by grid | Document, question, answers, comments, notes |
| Approve | Persist final field decision | `consensusAPI.resolveField(datasetId, reviewId, fieldName, finalDecision, resolvedBy)` | Approved decision and updated row status |
| Review Again | Request another annotation round | `consensusAPI.requestReview(datasetId)` | Review request result and row status update |
| Review Again notification | Create annotator-facing task notification | Existing backend review-request flow and notification service | Annotator sees the request in existing Tasks/Notifications surfaces |
| Collaborative Review participants | Resolve assigned annotators | `datasetsAPI.getCloneGroup(datasetId)` and progress data | Participant IDs |
| Collaborative Review snapshot | Snapshot unresolved consensus context | `consensusAPI.createSnapshot(datasetId)` | Snapshot ID |
| Collaborative Review session | Create session | `consensusAPI.createReviewSession(datasetId, body)` | Session ID and share code |
| Export Row | Export selected row | `consensusAPI.exportCsv(datasetId, 'row')` where supported | Browser download |
| Annotator Task list | Load assigned tasks and review requests | Existing `datasetsAPI.getMyTasks()` and notification APIs | Existing annotator Tasks/Notifications UI |
| Annotator Re-submit | Save revised annotation | Existing annotation/workbench and assignment APIs | Clone annotation updated and request marked Re-Submitted |

## Annotator Review Request Mapping

| Annotator surface | Workflow operation | Existing platform relationship | Expected use |
| --- | --- | --- | --- |
| Review Requests section | Load outstanding requests | Existing Tasks and notification data | Show cards on the current Tasks/Dashboard experience |
| Review Request card | Read request details | Existing task/request response | Dataset, workspace, project, row, reason, comment, requester, deadline |
| Notification entry | Open requested work | Existing notification API and task route | Navigate to `/dataset/[cloneDatasetId]/annotation` |
| Review Request banner | Explain requested correction | Request details already loaded by task/annotation context | Read-only reason, comment, requester, deadline |
| Requested row highlight | Focus annotator attention | Requested row/field context | Highlight only the requested row |
| Previous answer | Show read-only reference | Existing annotation data | Previous answer, confidence, submitted time |
| Submit Re-Annotation | Save revision | Existing annotation/workbench save flow | Update clone annotation and notify Admin |
| Submission success | Mark request complete or re-submitted | Existing assignment/request status flow | Show success and return to Tasks |

## Deadline Contract

- Admin sends `deadlineAt` as an ISO UTC timestamp and includes the selected timezone.
- Backend validates that the deadline is in the future when the request is created.
- Backend stores the deadline as a MongoDB Date and records the timezone for display.
- Annotator submission remains allowed after the deadline under the soft-deadline policy.
- Backend records `submittedLate` when the submission time is after `deadlineAt`.

## API Failure Rules

- Failed grid requests show the table Error State.
- Failed progress requests show the progress Error State without hiding usable rows.
- Failed approval does not change the row status.
- Failed Review Again does not change the row status.
- Failed session creation leaves the Collaborative Review modal open.
- Failed exports show an error toast.
- Unauthorized API responses follow the existing authentication redirect.
- Forbidden API responses show the existing permission state.
