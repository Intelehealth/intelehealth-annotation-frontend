# Review Consensus Wireframes

## Desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Existing Top Navigation                                                       │
│                                            [Refresh] [Export] [Search] [Filters]│
├───────────────────────┬──────────────────────────────────────────────────────┤
│ Existing Sidebar      │ Organizations > Workspace > Project > Dataset         │
│                       │ > Review Consensus                                   │
│ Dashboard             │                                                      │
│ Organizations         │ Review Consensus                                     │
│ Workspaces            │ Compare and resolve annotations for Dataset           │
│ Projects              │                                                      │
│ Datasets              │ [Total Rows] [Agreed] [Conflict] [Tie]                │
│ Analytics             │ [Partial] [Review Requested] [Annotator Progress]     │
│ Users                 │                                                      │
│ Profile               │ Annotator Progress                                   │
│ Notifications         │ [Annotator 1] [Annotator 2] [Annotator 3]             │
│ Documentation         │                                                      │
│ Logout                │ [Search rows, questions, annotators, answers...]      │
│                       │ [Status] [Agreement %] [Annotator] [Needs Review]     │
│                       │                                                      │
│                       │ Consensus Table                                      │
│                       │ Row | Question | Annotator Answers | Winner          │
│                       │     | Agreement % | Status | Actions                 │
│                       │                                                      │
│                       │ #25 | Invoice total | Ava: $8,420 | No winner         │
│                       │     | Marcus: $8,240 | 67% | Conflict | Review         │
│                       │                                                      │
│                       │ #26 | Vendor name | Northstar Supplies | 100%          │
│                       │     | Agreed | Review                                   │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

## Annotator Progress Card

```text
┌──────────────────────────────┐
│ [AT] Ava Thompson        ●    │
│                              │
│ Assigned Rows          48     │
│ Completed              46     │
│ Pending                  2    │
│ Agreement              94%    │
│ Online                       │
│                              │
│ [███████████████░░] 96%      │
└──────────────────────────────┘
```

## One Through Nine Annotators

```text
1: [A1]

2: [A1] [A2]

3: [A1] [A2] [A3]

4: [A1] [A2]
   [A3] [A4]

5: [A1] [A2] [A3]
   [A4] [A5]

6: [A1] [A2] [A3]
   [A4] [A5] [A6]

7: [A1] [A2] [A3] [A4]
   [A5] [A6] [A7]

8: [A1] [A2] [A3] [A4]
   [A5] [A6] [A7] [A8]

9: [A1] [A2] [A3]
   [A4] [A5] [A6]
   [A7] [A8] [A9]
```

## Row Details Drawer

```text
┌──────────────────────────────────────────────┐
│ Row #25                              [Close]  │
│ Conflict                                      │
│ Invoice total                                 │
├──────────────────────────────────────────────┤
│ Document Preview                              │
│ ┌──────────────────────────────────────────┐ │
│ │            Reference document             │ │
│ │            Invoice preview                │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ Question                                      │
│ Invoice total                                 │
├──────────────────────────────────────────────┤
│ Annotator Answers                             │
│                                              │
│ [AT] Ava Thompson                            │
│      $8,420.00                               │
│      Confidence: High                        │
│      Submitted: Today, 10:42 AM              │
│                                              │
│ [ML] Marcus Lee                              │
│      $8,240.00                               │
│      Confidence: Medium                      │
│      Submitted: Today, 10:48 AM              │
│                                              │
│ [PN] Priya Nair                              │
│      $8,420                                  │
│      Confidence: High                        │
│      Submitted: Today, 10:51 AM              │
├──────────────────────────────────────────────┤
│ Comments                                     │
│ [Add a comment...]                           │
├──────────────────────────────────────────────┤
│ Admin Notes                                  │
│ [Add an internal note...]                    │
├──────────────────────────────────────────────┤
│ [Approve] [Review Again]                     │
│ [Start Collaborative Review] [Export Row]    │
└──────────────────────────────────────────────┘
```

## Review Again Modal

```text
┌──────────────────────────────────────────────┐
│ Send Back For Re-Annotation             [X]   │
├──────────────────────────────────────────────┤
│ Reason                                       │
│ [Incorrect Label                         v]  │
│                                              │
│ Comment *                                    │
│ ┌──────────────────────────────────────────┐ │
│ │ Explain what should be corrected         │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Annotator Selection                          │
│ [Select all]                                 │
│ [✓] Annotator 1                              │
│ [✓] Annotator 2                              │
│ [ ] Annotator 3                              │
│                                              │
│ Deadline                                     │
│ [Tomorrow, 5:00 PM                       v]  │
│                                              │
│ Notification Preview                         │
│ Dataset: Invoice Dataset                     │
│ Row: 25                                      │
│ Reason: Incorrect Label                      │
│ Comment: Please verify this answer.          │
│ Deadline: Tomorrow, 5:00 PM                 │
├──────────────────────────────────────────────┤
│                 [Cancel] [Send Review Request]│
└──────────────────────────────────────────────┘
```

## Collaborative Review Modal

```text
┌──────────────────────────────────────────────┐
│ Start Collaborative Review              [X]  │
├──────────────────────────────────────────────┤
│ Participants                                 │
│ [A1] Annotator 1  [A2] Annotator 2          │
│ [A3] Annotator 3                             │
│                                              │
│ Meeting Title                                │
│ [Invoice Dataset consensus review          ] │
│                                              │
│ Share Code                                   │
│ [Generated after session creation]          │
│                                              │
│ Discussion Topic                             │
│ ┌──────────────────────────────────────────┐ │
│ │ Resolve the selected disagreement         │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│                    [Cancel] [Create Session] │
└──────────────────────────────────────────────┘
```

## Mobile

```text
Existing Top Navigation
Breadcrumb
Review Consensus

[Total Rows] [Agreed]
[Conflict]   [Tie]
[Partial]    [Review Requested]
[Annotator Progress]

Annotator Progress
[Annotator Card]
[Annotator Card]

[Search rows...]
[Filters]

┌──────────────────────────────┐
│ ROW #25                      │
│ Conflict                     │
│ Invoice total                │
│ Ava: $8,420 · Marcus: $8,240 │
│ Winner: No winner            │
│ 67% agreement                │
└──────────────────────────────┘
```
