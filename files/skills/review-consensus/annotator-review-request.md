# Annotator Review Request Wireframes

Documentation-only wireframes. No frontend redesign or implementation is included.

The annotator continues using the existing Latent Annotate Sidebar, Top Navigation, Tasks page, Dataset flow, and Annotation Workbench. Annotators never access the Admin Review Consensus page.

## End-To-End Flow

```text
Admin Review Consensus
        ↓
Admin clicks Review Again
        ↓
Review Request created
        ↓
Annotator notification
        ↓
Annotator Dashboard Review Request card
        ↓
Existing Annotation page
        ↓
Requested row highlighted
        ↓
Annotator revises answer
        ↓
Submit Re-Annotation
        ↓
Clone annotation updated
        ↓
Consensus regenerated
        ↓
Admin receives notification
        ↓
Admin reviews updated consensus
        ↓
Admin approves
```

## Annotator Dashboard

The existing Tasks/Dashboard experience receives a `Review Requests` section. It is not a new annotator portal.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Existing Latent Annotate Top Navigation                                       │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ Existing Sidebar      │ Dashboard > My Tasks                                  │
│                       │                                                      │
│ Dashboard             │ My Tasks                                             │
│ My Tasks              │ Datasets assigned to you for annotation              │
│ Datasets              │                                                      │
│ Profile               │ Task Summary                                         │
│ Notifications         │ [Not Started] [In Progress] [Review Requested]       │
│ Documentation         │ [Submitted]                                          │
│ Logout                │                                                      │
│                       ├──────────────────────────────────────────────────────┤
│                       │ Review Requests                                      │
│                       │ New review requests require your attention.          │
│                       │                                                      │
│                       │ ┌──────────────────────────────────────────────────┐ │
│                       │ │ [Purple] Review Requested                       │ │
│                       │ │ Invoice Dataset                                  │ │
│                       │ │ Workspace: Finance Operations                    │ │
│                       │ │ Project: Invoice Intelligence                    │ │
│                       │ │ Row 25                                           │ │
│                       │ │ Question count: 4                                │ │
│                       │ │ Requested by: Olivia Chen                        │ │
│                       │ │ Requested: Today, 10:52 AM                       │ │
│                       │ │ Due: Tomorrow, 5:00 PM                           │ │
│                       │ │ Reason: Incorrect Label                         │ │
│                       │ │ Comment: Verify Question 4 against the invoice. │ │
│                       │ │ [Open Review]              [View Details]        │ │
│                       │ └──────────────────────────────────────────────────┘ │
│                       ├──────────────────────────────────────────────────────┤
│                       │ Assigned Tasks                                       │
│                       │ [Invoice Dataset] [Receipt Dataset]                   │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

## Review Request Card

```text
┌──────────────────────────────────────────────────────────────┐
│ [●] Review Requested                                         │
├──────────────────────────────────────────────────────────────┤
│ Invoice Dataset                                              │
│ Workspace: Finance Operations                                │
│ Project: Invoice Intelligence                                │
│ Requested Row: Row 25                                       │
│ Question Count: 4                                           │
│ Requested By: Olivia Chen                                   │
│ Requested: Today, 10:52 AM                                  │
│ Due: Tomorrow, 5:00 PM                                      │
│ Reason: Incorrect Label                                      │
│ Admin Comment: Please verify Question 4.                    │
├──────────────────────────────────────────────────────────────┤
│ [Open Review]                         [View Details]          │
└──────────────────────────────────────────────────────────────┘
```

The card is read-only. `Open Review` opens the existing annotation route. `View Details` opens request details without editing. The card remains until the annotator submits the re-annotation.

## Review Request Details

```text
┌──────────────────────────────────────────────────────────────┐
│ Review Request Details                                   [X] │
├──────────────────────────────────────────────────────────────┤
│ Status: Review Requested                                    │
│ Dataset: Invoice Dataset                                    │
│ Workspace: Finance Operations                               │
│ Project: Invoice Intelligence                               │
│ Requested Row: Row 25                                       │
│ Requested By: Olivia Chen                                   │
│ Reason: Incorrect Label                                     │
│ Admin Comment: Please verify Question 4.                    │
│ Deadline: Tomorrow, 5:00 PM                                │
├──────────────────────────────────────────────────────────────┤
│ [Close]                              [Open Review]           │
└──────────────────────────────────────────────────────────────┘
```

## Notification Panel

The existing notification panel adds the `Review Requested` notification type.

```text
┌──────────────────────────────────────────────┐
│ Notifications                            [X] │
├──────────────────────────────────────────────┤
│ Review Requested                             │
│ Invoice Dataset                              │
│ Workspace: Finance Operations                │
│ Project: Invoice Intelligence                │
│ Row 25                                       │
│ Reason: Incorrect Label                      │
│ Requested by: Olivia Chen                    │
│ Today, 10:52 AM                              │
│ [Open]                                       │
└──────────────────────────────────────────────┘
```

```text
Notification clicked → Existing annotation route → Requested row highlighted
```

The notification never opens Review Consensus for an Annotator.

## Route Navigation

```text
Organization → Workspace → Project → Dataset Clone → Annotation
```

Correct destination:

```text
/dataset/[cloneDatasetId]/annotation
```

Incorrect Annotator destination:

```text
/dataset/[datasetId]/consensus
```

The Annotator works inside the assigned clone dataset. The Admin or Owner reviews the aggregated parent dataset.

## Existing Annotation Page

The existing annotation page remains unchanged except for Review Request context.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Existing Sidebar | Existing Top Navigation                                  │
├─────────────────┴────────────────────────────────────────────────────────────┤
│ Organization > Workspace > Project > Dataset > Annotation                    │
│                                                                              │
│ Invoice Dataset                                                              │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Review Request                                                           │ │
│ │ Requested By: Olivia Chen                                               │ │
│ │ Reason: Incorrect Label                                                  │ │
│ │ Deadline: Tomorrow, 5:00 PM                                             │ │
│ │ Comment: Please verify Question 4.                                      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Existing Document Viewer                                                    │
│ [Zoom Out] [Zoom In] [Rotate] [Previous Page] [Next Page]                   │
│                                                                              │
│ Annotation Rows                                                             │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ [Purple] Needs Re-Annotation                                            │ │
│ │ Row 25                                                                   │ │
│ │ Question 1                         Existing answer                       │ │
│ │ Question 2                         Existing answer                       │ │
│ │ Question 3                         Existing answer                       │ │
│ │ Question 4                         Editable requested field              │ │
│ │ Previous Answer: $8,240.00                                               │ │
│ │ Confidence: Medium                                                       │ │
│ │ Submitted: Today, 10:48 AM                                               │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ [Cancel]                                           [Submit Re-Annotation]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Requested Row Highlight

```text
Normal row                         Requested row

┌──────────────────────────┐      ┌──────────────────────────┐
│ Row 12                   │      │ [● Needs Re-Annotation]  │
│ Question 1               │      │ Row 25                   │
│ Question 2               │      │ Question 1               │
└──────────────────────────┘      │ Question 2               │
                                  │ Question 3               │
                                  │ Question 4               │
                                  └──────────────────────────┘
```

Only the requested row receives the `Needs Re-Annotation` badge. All other rows remain normal.

## Field-Level And Row-Level Editing

Field-level request:

```text
Row 25 [Needs Re-Annotation]
Question 1   [Read-only existing field]
Question 2   [Read-only existing field]
Question 3   [Read-only existing field]
Question 4   [Editable requested field]
Previous Answer: $8,240.00
Confidence: Medium
Submitted: Today, 10:48 AM
```

Only requested fields unlock. Previous values and other fields remain read-only.

Row-level request:

```text
Row 25 [Needs Re-Annotation]
Question 1   [Editable]
Question 2   [Editable]
Question 3   [Editable]
Question 4   [Editable]
```

All fields in the requested row unlock. Previous answers remain visible as read-only references.

## Existing Document Viewer

Reuse the existing document viewer without redesign:

```text
┌──────────────────────────────────────────────────────────────┐
│ Reference Document                                            │
├──────────────────────────────────────────────────────────────┤
│ [Zoom Out] [Zoom In] [Rotate] [Previous Page] [Next Page]     │
│                    Existing document viewer                  │
│ Page 1 of 2                                                  │
└──────────────────────────────────────────────────────────────┘
```

## Submit Re-Annotation

```text
┌──────────────────────────────────────────────────────────────┐
│ Review Request [Needs Re-Annotation]                         │
├──────────────────────────────────────────────────────────────┤
│ Existing annotation fields                                  │
│ Requested fields are editable.                              │
├──────────────────────────────────────────────────────────────┤
│ [Cancel]                         [Submit Re-Annotation]       │
└──────────────────────────────────────────────────────────────┘
```

Submission flow:

```text
Submit Re-Annotation → Validate → Saving → Save clone annotation
→ Notify Admin → Re-Submitted → Return to Tasks
```

## Saving State

```text
[Spinner] Saving your review...
Submit Re-Annotation disabled
Requested fields temporarily disabled
```

## Submission Success

```text
┌──────────────────────────────────────────────────────────────┐
│ [Green Check] Re-Annotation Submitted Successfully            │
├──────────────────────────────────────────────────────────────┤
│ Your revised annotation was sent to the admin for review.     │
│ Status: [● Re-Submitted]                                     │
│ [Back to Tasks]                                              │
└──────────────────────────────────────────────────────────────┘
```

## Submission Failure And Retry

```text
┌──────────────────────────────────────────────────────────────┐
│ [Red Alert] Submission Failed                                │
├──────────────────────────────────────────────────────────────┤
│ We could not submit this review. Your changes were not lost.  │
│ [Try Again]                              [Back to Task]       │
└──────────────────────────────────────────────────────────────┘
```

Keep the annotator on the requested row, preserve entered values where possible, and do not mark the request Re-Submitted until the API succeeds.

## Empty States

```text
Review Requests
[Check] No review requests
You have no annotations waiting for re-review.

My Tasks
[Clipboard] No tasks assigned yet
Your admin has not assigned any datasets to you.

Review Requests
No pending review rows
All requested rows have been submitted or completed.
```

## Responsive Behavior

| Area | Desktop | Laptop | Tablet | Mobile |
| --- | --- | --- | --- | --- |
| Shell | Existing Sidebar and TopNav | Existing Sidebar and TopNav | Existing shell behavior | Existing mobile shell behavior |
| Banner | Wide above requested row | Compact banner | Full-width banner | Stacked banner |
| Document viewer | Existing viewer beside or above form | Existing viewer with reduced gaps | Stacked above form | Full-width viewer |
| Requested row | Wide highlighted section | Compact highlighted section | Full-width highlighted section | Stacked highlighted card |
| Fields | Existing form layout | Existing form layout with reduced spacing | Full-width controls | Full-width controls |
| Submit | Inline with existing actions | Inline where possible | Full-width or wrapped | Full-width |
| Document controls | Inline | Inline | Wrapped | Touch-sized controls |

Navigation is not redesigned at any breakpoint.

## Accessibility Requirements

- Keyboard order is Existing Shell, Review Request banner, document controls, requested row, fields, and Submit Re-Annotation.
- All interactive controls have visible focus states.
- Document controls have labels for Zoom Out, Zoom In, Rotate, Previous Page, and Next Page.
- `Needs Re-Annotation` is readable without relying on color.
- Previous answers are marked read-only.
- Saving uses an accessible live region.
- Success and failure messages are announced.
- Retry is keyboard accessible.
- Validation errors are associated with fields.
- Submit Re-Annotation communicates its disabled saving state.

## Annotator Acceptance Criteria

- Existing annotator Sidebar, Top Navigation, Tasks page, Dataset flow, and Annotation Workbench are reused.
- Review Request cards show dataset, workspace, project, row, requester, time, due date, reason, comment, and status.
- Notification entries open the existing annotation route, never Review Consensus.
- The Review Request banner is read-only.
- Only requested rows are highlighted.
- Only requested fields unlock for field-level requests.
- Entire requested rows unlock for row-level requests.
- Previous answers, confidence, submitted time, and admin comments remain read-only.
- Existing document viewer controls are reused.
- Submit Re-Annotation is the only final annotator action.
- Saving, success, failure, retry, and empty states are documented.
- The workflow supports one through nine annotators.
- Annotators cannot approve, override, reject, or start Collaborative Review.
- No AI, Copilot, Judge, mock data, or mock metrics are introduced.
