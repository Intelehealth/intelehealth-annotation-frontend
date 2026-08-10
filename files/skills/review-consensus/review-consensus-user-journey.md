# Review Consensus User Journey

This document describes the existing Admin/Owner and Annotator Review Again journey. It does not add new screens or change navigation.

## Admin Journey

```text
Admin or Owner
      ↓
Open Review Consensus
      ↓
Load summary and annotator progress
      ↓
Search or filter rows
      ↓
Open row details drawer
      ↓
Approve
      │
      └──> Approved

OR

Review Again
      ↓
Select reason, comment, annotators, deadline
      ↓
Review notification preview
      ↓
Send Review Request
      ↓
Notification created
      ↓
Annotator receives request
      ↓
Annotator submits revised answer
      ↓
Consensus refreshes
      ↓
Admin or Owner reviews again
      ↓
Approve
```

## Annotator Journey

```text
Review Requested notification
      ↓
Open My Tasks
      ↓
Open Review Request card
      ↓
Open existing Annotation task
      ↓
Requested row highlighted
      ↓
Read admin comment and previous answer
      ↓
Re-annotate requested field or row
      ↓
Submit Re-Annotation
      ↓
Saving
      ↓
Re-Submitted
      ↓
Waiting for Admin Review
```

## Boundary Rules

- Admins and Owners use Review Consensus.
- Annotators use existing Tasks, Notifications, and Annotation Workbench screens.
- Annotators never approve consensus.
- Annotators never start Collaborative Review.
- Annotators never access admin-only row actions.
