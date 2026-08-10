# Review Consensus UI Specification

This is the complete UI specification for the Review Consensus page.

This document is planning and design documentation only. It does not implement code, change the existing workflow, redesign the Sidebar or Top Navigation, or introduce new product functionality.

The page is available to Organization Owners and Admins. Annotators use the existing Tasks, Notifications, Dataset, and Annotation Workbench flows and never access the Admin Review Consensus page.

## Approved Scope

The page includes:

- Existing Sidebar.
- Existing Top Navigation.
- Review Consensus breadcrumb.
- Refresh.
- Export.
- Search.
- Filters.
- Total Rows, Agreed, Conflict, Tie, Partial, Review Requested, and Annotator Progress summary cards.
- Annotator progress cards for one through nine annotators.
- Consensus table.
- Responsive row cards.
- Row details drawer.
- Approve.
- Review Again.
- Start Collaborative Review.
- Export Row.
- Review Again modal.
- Collaborative Review modal.

The page does not include AI, analytics, productivity dashboards, bulk actions, override winner, reject, history timeline, vote distribution, or a new shell design.

## 1. Complete Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Existing Latent Annotate Top Navigation                                                       │
│                                                                                              │
│ [Menu]                                                       [Refresh] [Export] [Search]      │
│                                                              [Filters] [Notifications] [User] │
├───────────────────────┬──────────────────────────────────────────────────────────────────────┤
│ Existing Sidebar      │ Organizations > Workspace > Project > Dataset > Review Consensus     │
│                       │                                                                      │
│ Dashboard             │ Review Consensus                                                     │
│ Organizations         │ Compare and resolve annotations for Invoice Dataset                  │
│ Workspaces            │                                                                      │
│ Projects              │                                              [Export]                │
│ Datasets              ├──────────────────────────────────────────────────────────────────────┤
│ Analytics             │ Summary Cards                                                        │
│ Users                 │                                                                      │
│ Profile               │ [Total Rows] [Agreed] [Conflict] [Tie] [Partial]                    │
│ Notifications         │ [Review Requested] [Annotator Progress]                              │
│ Documentation         │                                                                      │
│ Logout                ├──────────────────────────────────────────────────────────────────────┤
│                       │ Annotator Progress                                                   │
│                       │                                                                      │
│                       │ [Annotator 1] [Annotator 2] [Annotator 3]                           │
│                       │                                                                      │
│                       ├──────────────────────────────────────────────────────────────────────┤
│                       │ Toolbar                                                              │
│                       │                                                                      │
│                       │ [Search rows, questions, annotators, answers...] [Filters]          │
│                       │                                                                      │
│                       ├──────────────────────────────────────────────────────────────────────┤
│                       │ Consensus Table                                                     │
│                       │                                                                      │
│                       │ Row | Question | Annotator Answers | Winner | Agreement | Status    │
│                       │     |          |                   |        | %         | Actions   │
│                       │                                                                      │
│                       │ 25  | Invoice  | Ava: $8,420.00    | None   | 67%       | Conflict  │
│                       │     | total    | Marcus: $8,240.00 |        |           | [Review]  │
│                       │                                                                      │
│                       │ 26  | Vendor   | Ava: Northstar    | North- | 100%      | Agreed    │
│                       │     | name     | Marcus: Northstar | star    |           | [Review]  │
│                       │                                                                      │
│                       │ 27  | Invoice  | Ava: Jun 18       | Jun 18 | 67%       | Partial   │
│                       │     | date     | Priya: Pending     |        |           | [Review]  │
│                       │                                                                      │
│                       ├──────────────────────────────────────────────────────────────────────┤
│                       │ Pagination                                                           │
│                       │ Showing 1-50 of 240 rows                           [Prev] 1 2 [Next] │
│                       ├──────────────────────────────────────────────────────────────────────┤
│                       │ Footer                                                               │
│                       │ Review Consensus                                      Last synced ...│
└───────────────────────┴──────────────────────────────────────────────────────────────────────┘
```

### Desktop Header

- Breadcrumb appears above the page title.
- Page title is `Review Consensus`.
- Dataset context appears below the title.
- Header-level actions are Refresh, Export, Search, and Filters.
- Existing notification and user profile controls remain in the existing Top Navigation.

### Desktop Summary Cards

The summary strip contains exactly seven cards:

- Total Rows.
- Agreed.
- Conflict.
- Tie.
- Partial.
- Review Requested.
- Annotator Progress.

### Desktop Annotator Cards

Each card includes:

- Avatar.
- Name.
- Assigned Rows.
- Completed.
- Pending.
- Agreement %.
- Online Status.

The grid supports exactly one through nine annotators.

### Desktop Toolbar

- Search input spans the available flexible width.
- Filters expose Status, Agreement %, Annotator, Question, and Needs Review.
- Toolbar does not contain bulk actions or additional enterprise controls.

### Desktop Table

Columns:

- Row.
- Question.
- Annotator Answers.
- Winner.
- Agreement %.
- Status.
- Actions.

Row actions open the row details drawer. Row action buttons are Approve, Review Again, Start Collaborative Review, and Export Row inside the drawer.

### Desktop Pagination

- Shows current range, total rows, current page, and total pages.
- Previous and Next buttons have disabled states at the boundaries.
- Pagination preserves search and filters.
- Search and filter changes reset pagination to page 1.

### Desktop Footer

- Uses the existing page surface and spacing.
- Shows the current dataset context and last synchronization state where available.
- Does not introduce analytics or productivity information.

## 2. Laptop Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Existing Sidebar │ Existing Top Navigation                                   │
├─────────────────┴────────────────────────────────────────────────────────────┤
│ Breadcrumb                                                                │
│ Review Consensus                                      [Export]              │
│                                                                            │
│ [Total] [Agreed] [Conflict] [Tie] [Partial] [Review Requested]             │
│ [Annotator Progress]                                                        │
│                                                                            │
│ Annotator Progress                                                          │
│ [A1] [A2] [A3]                                                             │
│                                                                            │
│ [Search rows...] [Filters]                                                 │
│                                                                            │
│ Consensus Table with limited horizontal scrolling                          │
│                                                                            │
│ Pagination                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Laptop rules:

- Existing Sidebar remains visible.
- Summary cards may use horizontal scrolling or wrapped rows.
- Annotator cards use three columns where space permits.
- Table keeps all required columns and uses limited horizontal scrolling only when needed.
- Row drawer opens from the right at a reduced width.
- Toolbar controls wrap before the table becomes unusable.

## 3. Tablet Layout

```text
┌──────────────────────────────────────────────┐
│ Existing Top Navigation                      │
├──────────────────────────────────────────────┤
│ Breadcrumb                                    │
│ Review Consensus                              │
│                                              │
│ [Total Rows] [Agreed]                        │
│ [Conflict]   [Tie]                           │
│ [Partial]    [Review Requested]               │
│ [Annotator Progress]                          │
│                                              │
│ Annotator Progress                            │
│ [Annotator Card] [Annotator Card]            │
│ [Annotator Card]                             │
│                                              │
│ [Search rows...]                             │
│ [Filters]                                    │
│                                              │
│ Consensus row cards                          │
│                                              │
│ Pagination                                   │
└──────────────────────────────────────────────┘
```

Tablet rules:

- Existing navigation behavior is preserved.
- Summary cards use two columns.
- Annotator cards use two columns.
- The table may become stacked row cards when seven columns no longer fit.
- Row details open as a full-height overlay.
- Modal content remains scrollable without clipping actions.
- Buttons wrap into two rows when needed.

## 4. Mobile Layout

```text
┌──────────────────────────────┐
│ Existing Top Navigation      │
├──────────────────────────────┤
│ Breadcrumb                   │
│ Review Consensus             │
│                              │
│ [Total Rows] [Agreed]        │
│ [Conflict]   [Tie]           │
│ [Partial]    [Review Req.]   │
│ [Annotator Progress]         │
│                              │
│ Annotator Progress           │
│ [Annotator Card]             │
│ [Annotator Card]             │
│                              │
│ [Search rows...]             │
│ [Filters]                    │
│                              │
│ ┌──────────────────────────┐ │
│ │ ROW #25                  │ │
│ │ Conflict                 │ │
│ │ Invoice total            │ │
│ │ Ava: $8,420              │ │
│ │ Marcus: $8,240           │ │
│ │ Winner: No winner        │ │
│ │ 67% agreement            │ │
│ └──────────────────────────┘ │
│                              │
│ [Prev] 1 [Next]              │
└──────────────────────────────┘
```

Mobile rules:

- Existing mobile shell behavior is preserved.
- Summary cards use two columns or a horizontal strip.
- Annotator cards are stacked vertically.
- Each consensus row becomes a compact card.
- The row drawer becomes full-screen.
- Action buttons stack vertically.
- Pagination controls use touch-sized targets.

## 5. Spacing System

The page uses the existing design system spacing scale based on an 8px grid.

| Token | Value | Use |
| --- | ---: | --- |
| `space-1` | 8px | Icon gaps, compact label gaps |
| `space-2` | 16px | Input padding, card internal gaps |
| `space-3` | 24px | Compact section gaps |
| `space-4` | 32px | Card and section spacing |
| `space-5` | 40px | Major section separation |
| `space-6` | 48px | Page-level separation |
| `space-8` | 64px | Large responsive spacing |

Layout tokens:

| Element | Specification |
| --- | --- |
| Container width | Fluid up to approximately 1800px with responsive horizontal padding |
| Desktop page padding | 32px horizontal, 16px top, 40px bottom |
| Laptop page padding | 24px horizontal |
| Tablet page padding | 16px horizontal |
| Mobile page padding | 16px horizontal |
| Card padding | 16px standard, 20px for major sections |
| Table header height | Approximately 44px |
| Table row height | Approximately 64-88px depending on answer wrapping |
| Compact control height | 36px |
| Small action height | 28-32px |
| Drawer width | Approximately 640px desktop, fluid below laptop width |
| Modal width | Approximately 512px, fluid on mobile |
| Section gap | 20-24px |

## 6. Typography

| Element | Token |
| --- | --- |
| Page title | 22px, semibold, tight tracking |
| Section title | 14px, semibold |
| Summary card label | 10px, semibold, uppercase, tracked |
| Summary card value | 20px, semibold |
| Table header | 10px, semibold, uppercase, tracked |
| Table body | 12px, regular or medium |
| Row metadata | 10-11px, muted |
| Status badge | 11px, semibold |
| Drawer heading | 18px, semibold |
| Drawer body | 12-14px |
| Comments and notes | 12px, regular, relaxed line height |
| Button label | 12-14px, medium or semibold |
| Empty state title | 14px, semibold |
| Empty state description | 12px, regular |

Use the existing platform sans-serif font stack. Do not introduce a new font family.

## 7. Color Tokens

### Surface And Layout

| Token | Color / rule | Use |
| --- | --- | --- |
| Page background | Existing light slate background | Page canvas |
| Surface | White | Cards, table, drawer, modal |
| Primary text | Slate 900 | Headings and important values |
| Secondary text | Slate 500 | Descriptions and labels |
| Muted text | Slate 400 | Metadata and placeholders |
| Border | Slate 200 | Card, table, input, and modal borders |
| Hover surface | Slate 50 | Row and card hover |
| Selection surface | Indigo 50 | Focused or selected row context |
| Focus ring | Indigo 400/500 | Keyboard focus |
| Disabled text | Slate 400 | Disabled controls |
| Disabled surface | Slate 100 | Disabled controls |

### Status Colors

| Status | Color | Badge rule |
| --- | --- | --- |
| Agreed | Emerald 500/600 | Green dot, pale green surface, green text |
| Conflict | Orange 500/600 | Orange dot, pale orange surface, orange text |
| Tie | Rose 500/600 | Red dot, pale rose surface, red text |
| Partial | Blue 500/600 | Blue dot, pale blue surface, blue text |
| Review Requested | Violet 500/600 | Purple dot, pale violet surface, purple text |
| Pending | Slate 400/500 | Gray dot, pale gray surface, gray text |
| Approved | Teal 500/600 | Teal dot, pale teal surface, teal text |

Status must always include readable text. Color is never the only status signal.

## 8. Button States

| State | Visual behavior | Interaction |
| --- | --- | --- |
| Normal | Standard border or primary fill | Action is available |
| Hover | Slightly darker surface or border | Pointer feedback only |
| Pressed | Darker fill and reduced shadow | Action is being activated |
| Loading | Spinner replaces or accompanies label | Button is temporarily unavailable |
| Disabled | Reduced contrast, disabled cursor, no hover | No interaction |
| Success | Existing success toast or success status result | Action completed |
| Error | Existing error toast; button returns to usable state | Action failed without silent mutation |

Button rules:

- Primary actions use the existing primary button style.
- Secondary actions use the existing outline style.
- Drawer actions remain limited to Approve, Review Again, Start Collaborative Review, and Export Row.
- Modal actions use Cancel plus the modal-specific submit action.
- Disabled buttons retain readable labels and accessible disabled state.

## 9. Loading States

### Skeleton Cards

```text
┌──────────────────────────────┐
│ [████] [██████████]          │
│                              │
│ [████████]                  │
│ [██████████████████]        │
│ [██████████████]            │
└──────────────────────────────┘
```

Use skeletons for summary and annotator cards while progress is loading.

### Skeleton Table

```text
┌──────┬────────────┬────────────────────┬──────────┬────────┬────────────┐
│██████│████████████│████████████████████│██████████│████████│████████████│
├──────┼────────────┼────────────────────┼──────────┼────────┼────────────┤
│██████│████████████│████████████████████│██████████│████████│████████████│
│██████│████████████│████████████████████│██████████│████████│████████████│
└──────┴────────────┴────────────────────┴──────────┴────────┴────────────┘
```

### Skeleton Drawer

- Drawer header skeleton.
- Document preview skeleton.
- Question skeleton.
- Annotator answer skeletons.
- Comment and note skeletons.
- Disabled action footer until the row is loaded.

## 10. Empty States

### No Dataset

```text
Dataset not found
The selected dataset is unavailable or has been removed.
[Back to Datasets]
```

### No Annotators

```text
No annotators assigned
Assign annotators to this dataset before starting consensus review.
```

### No Clone Datasets

```text
No clone datasets available
Consensus rows will appear after annotator clone assignments exist.
```

### No Review Requests

```text
No review requests
There are no rows waiting for re-annotation.
```

### No Conflicts

```text
No conflicts found
All available rows currently have an agreed or approved result.
```

### No Data

```text
No consensus rows found
Rows will appear when annotations are available for this dataset.
```

Empty states preserve the existing shell and keep relevant Search, Filters, or Refresh controls available.

## 11. Error States

| Error | Visible state | Enabled action |
| --- | --- | --- |
| API Failure | Inline error in affected table or progress region | Retry |
| Unauthorized | Existing authentication redirect or sign-in state | Sign in |
| Forbidden | Permission message inside existing shell | Return to permitted area |
| Dataset Missing | Dataset not found message | Back to Datasets, Retry |
| Timeout | Request timeout message | Retry |

Error rules:

- Keep unaffected data visible when only one region fails.
- Do not silently change row status after a failed action.
- Preserve modal form values when a submit request fails where possible.
- Make Retry keyboard accessible.

## 12. Toast Notifications

| Type | Example | Use |
| --- | --- | --- |
| Success | `Row approved` | A decision or export completed |
| Warning | `Review request still pending` | Action completed with a pending condition |
| Error | `Review request failed` | API action failed |
| Info | `Filters cleared` | Non-destructive page feedback |

Toasts use the existing platform toast provider and are announced accessibly.

## 13. Responsive Behavior

| Area | Desktop | Laptop | Tablet | Mobile |
| --- | --- | --- | --- | --- |
| Sidebar | Existing Sidebar visible | Existing Sidebar visible | Existing shell behavior | Existing mobile shell behavior |
| Top Navigation | Existing TopNav | Existing TopNav | Existing TopNav | Existing TopNav |
| Grid layout | Up to three-column annotator grid | Compact three-column grid | Two-column sections | Single-column sections |
| Drawer | Right-side approximately 640px | Right-side reduced width | Full-height overlay | Full-screen drawer |
| Cards | Summary strip and annotator cards | Wrapped or scrollable strip | Two-column cards | Stacked cards |
| Table | Full comparison table | Full table with limited horizontal scroll | Stacked row cards if needed | Stacked row cards |
| Buttons | Inline action groups | Wrapped action groups | Two-row action groups | Stacked full-width actions |
| Toolbar | Search and Filters in one row | Search and Filters in one row where possible | Search above filters | Search followed by Filters |
| Search | Flexible full-width input | Flexible input | Full-width input | Full-width input |
| Filters | Inline select controls | Inline or wrapped controls | Wrapped controls | Expanded filter area |
| Annotator Cards | One through nine in up to three columns | Compact grid | Two columns | One column |
| Status Cards | Seven-card horizontal strip | Wrapped or horizontal strip | Two-column grid | Two-column grid or horizontal strip |
| Pagination | Below table with totals | Below table with totals | Below cards/table | Below cards with touch targets |

## 14. Accessibility

### Keyboard

- All links, buttons, inputs, selects, checkboxes, rows, drawers, and modals are keyboard reachable.
- Enter activates focused buttons, links, and row-open controls.
- Space toggles focused checkboxes and supported buttons.
- Escape closes the drawer or modal unless a submission is in progress.

### Tab Order

```text
Existing Sidebar / Top Navigation
→ Breadcrumb
→ Header actions
→ Summary cards when interactive
→ Annotator cards when interactive
→ Search
→ Filters
→ Table row actions
→ Drawer or modal controls
```

### Focus States

- Every interactive element has a visible focus ring.
- Focus is never communicated by color alone.
- Focus moves into the drawer or modal on open.
- Focus returns to the triggering control on close.

### ARIA And Screen Readers

- Icon-only Search, Filters, Close, Pagination, and More controls have accessible labels.
- Table headers are associated with table cells.
- Status badges include readable text.
- Loading regions expose an accessible busy state.
- Error and success toasts use a live region.
- Drawer and modal headings are announced on open.
- Required Review Again fields expose validation errors programmatically.

## 15. Reusable Components

| Component | Reuse boundary |
| --- | --- |
| Existing `Sidebar` | Shared platform shell; unchanged |
| Existing `TopNav` | Shared platform shell; unchanged |
| `Breadcrumb` | Review Consensus route context |
| `StatCard` | Summary card presentation |
| `StatusBadge` | Status labels across cards, table, drawer, and modals |
| `Avatar` | Annotator identity presentation |
| `AnnotatorCard` | One through nine annotator progress records |
| `ConsensusToolbar` | Search and filter controls |
| `ConsensusTable` | Desktop row comparison |
| `ConsensusTableRow` | One table row |
| `ConsensusMobileCard` | Tablet/mobile row representation |
| `RowDetailsDrawer` | Selected row review |
| `DocumentPreview` | Reference document area |
| `AnnotatorAnswerCard` | One annotator's answer within the drawer |
| `CommentsSection` | Row comments |
| `AdminNotesSection` | Internal notes |
| `ReviewAgainModal` | Review request form and preview |
| `CollaborativeReviewModal` | Existing collaborative session entry point |
| `LoadingSkeleton` | Loading presentation |
| `EmptyState` | No-data presentation |
| `ErrorState` | Recoverable error presentation |
| `Toast` | Existing platform feedback provider |

## 16. Interaction Notes

### Search

- Search rows, questions, annotator names, answers, and winners where available.
- Search updates the visible consensus rows.
- Search does not mutate backend data.
- Clearing search restores the current filter result.

### Filters

- Status options include Agreed, Conflict, Tie, Partial, Review Requested, and Pending.
- Agreement options include Below 70% and 70% or above.
- Annotator options are limited to assigned annotators.
- Needs Review includes Conflict, Tie, Partial, and Review Requested.
- Filter changes reset pagination to page 1.

### Pagination

- Use existing grid pagination metadata for large datasets.
- Show current range, page, total pages, and total rows.
- Preserve Search and Filters when changing page.
- Disable Previous on page 1 and Next on the final page.
- Mobile uses the same pagination state with touch-sized buttons.

### Drawer

- Row click, question click, or Review opens the drawer.
- Drawer contains Document Preview, Question, Annotator Answers, Comments, and Admin Notes.
- Drawer actions are Approve, Review Again, Start Collaborative Review, and Export Row.
- Clicking Close, outside the drawer, or Escape closes it when safe.

### Review Again Modal

- Opens for the active row.
- Requires a reason, comment, at least one annotator, and deadline.
- Shows the exact notification preview.
- Disables submission while saving.
- On success, the row status becomes Review Requested.

### Collaborative Review Modal

- Shows assigned participants, Meeting Title, Share Code, and Discussion Topic.
- Uses existing snapshot and session APIs.
- On success, navigates to the existing Collaborative Review route.
- Annotators never see or use this modal.

### Notification Flow

```text
Admin sends Review Again
        ↓
Existing notification/task flow creates Review Requested entry
        ↓
Annotator opens My Tasks or Notifications
        ↓
Existing clone annotation route opens
        ↓
Requested row is highlighted
        ↓
Annotator submits re-annotation
        ↓
Admin consensus data refreshes
```

## 17. Acceptance Criteria

### Every Component

- Existing Sidebar and TopNav are reused without redesign.
- Breadcrumb renders the full Review Consensus path.
- Summary Cards render exactly the seven approved metrics.
- Annotator Cards support exactly one through nine annotators.
- Toolbar exposes Search and Filters only.
- Consensus Table renders Row, Question, Annotator Answers, Winner, Agreement %, Status, and Actions.
- Row Card is used when the table is too narrow.
- Drawer renders Document Preview, Question, Annotator Answers, Comments, and Admin Notes.
- Review Again Modal renders reason, comment, annotator selection, deadline, and notification preview.
- Collaborative Review Modal renders participants, Meeting Title, Share Code, and Discussion Topic.
- Loading Skeletons, Empty State, and Error State remain inside the existing shell.

### Every Layout

- Desktop renders the complete table and right-side drawer.
- Laptop preserves the sidebar and usable table.
- Tablet uses stacked sections and full-height drawer behavior where needed.
- Mobile uses stacked cards, full-screen drawer, and full-width action controls.
- One through nine annotator layouts do not overlap or hide required content.

### Every Interaction

- Refresh reloads consensus data and progress.
- Export downloads the existing consensus report.
- Search filters visible rows.
- Filters update visible rows and reset pagination.
- Pagination preserves search and filters.
- Opening a row displays the drawer.
- Approve updates the row only after a successful API response.
- Review Again validates required fields and shows the notification preview.
- Successful Review Again changes the row to Review Requested.
- Collaborative Review creates the existing session and navigates to the existing route.
- Export Row uses the existing row export behavior.
- Notification flow opens the existing annotator route, never Review Consensus.

### Every State

- Loading states show skeletons and disable unsafe actions.
- Empty states show useful messages and preserve the existing shell.
- No annotators and no clone datasets are distinguishable.
- Partial, Conflict, Tie, Agreed, Approved, Review Requested, and Re-Submitted statuses are readable and color-supported.
- API errors show Retry or an error toast without silent mutation.
- Unauthorized, Forbidden, Dataset Missing, and Timeout states are documented.
- Review Again saving state prevents duplicate submission.
- Collaborative Review saving state prevents duplicate session creation.
- Toast success, warning, error, and info states are accessible.
- Keyboard focus, tab order, ARIA labels, Escape, Enter, Space, and screen reader behavior are documented.

## 18. Component Responsibility Table

| Component | Purpose | Inputs | Outputs | Loading state | Empty state | Error state | Responsive behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Summary Cards | Show the seven approved consensus totals | Progress response and derived row counts | Visible totals and status context | Skeleton card | Zero values or section empty message | Section-level progress error | Horizontal strip desktop, wrapped cards on smaller layouts |
| Annotator Cards | Show assigned annotator progress for one through nine annotators | Annotator ID, name, assigned rows, completed rows, pending rows, agreement, online state | Progress cards | Skeleton card | No annotators assigned message | Progress error without hiding usable table data | Three columns desktop, two tablet, one mobile |
| Consensus Table | Compare rows across annotators | Normalized rows, status, agreement, pagination metadata | Row open action and visible comparison | Skeleton table | No consensus rows message | Inline table error with Retry | Full table desktop/laptop, stacked cards tablet/mobile |
| Row Drawer | Inspect and act on one consensus row | Active row, answer list, callbacks | Approve, Review Again, Collaborative Review, Export Row events | Drawer skeleton | No answers or document preview message | Action toast or drawer error | Right drawer desktop, full-height/full-screen smaller layouts |
| Review Again Modal | Configure and confirm a re-annotation request | Active row, annotators, reason, comment, deadline | Review request submission or cancel | Submit button loading state | No eligible annotators message | Inline validation and error toast | Centered modal desktop, fluid stacked modal mobile |
| Collaborative Review Modal | Configure an existing collaborative session | Participants, title, share code context, discussion topic | Session creation or cancel | Create Session loading state | No participants message | Error toast; modal remains open | Centered modal desktop, fluid stacked modal mobile |
| Search | Find loaded consensus rows | Query string | Filtered row list | Search control remains usable | No matching rows message | No API mutation; retain current data | Flexible desktop input, full-width mobile input |
| Filters | Narrow rows by status, agreement, annotator, needs review, and fixed dataset context | Filter values and assigned annotators | Filtered row list and page reset | Filter controls remain usable | No matching rows message | Invalid filter does not mutate data | Inline desktop, wrapped tablet, expanded mobile controls |
| Export Button | Download the existing consensus report | Dataset context and export type | Browser download and toast | Loading/disabled state while request runs | Disabled when no exportable data exists | Error toast | Header action desktop, stacked or compact smaller layouts |

Component rules:

- Inputs are data or callbacks from the page coordinator unless the component is purely presentational.
- Outputs are user events or presentational changes; components do not introduce new backend behavior.
- Loading, empty, and error states remain inside their owning section whenever possible.
- Existing Sidebar and TopNav remain shared platform components and are not redesigned.

## 19. UX Decision Rules

| Action | Enabled when | Disabled when | Why disabled |
| --- | --- | --- | --- |
| Approve | A row is open and a valid final answer/decision exists | No row, Pending without a valid decision, Review Requested while waiting, or request is submitting | Approval must not create a decision from incomplete data |
| Review Again | A row is open and at least one assigned annotator can receive a request | No row, no eligible annotators, or a request is submitting | A review request needs a row and recipient |
| Start Collaborative Review | Unresolved consensus context exists and participants are available | No participants, no unresolved context, or session creation is submitting | A session cannot be created without a review context |
| Export | Dataset or row export data is available | Export request is running or there is no exportable dataset/row | Avoid duplicate requests and empty downloads |
| View Details | A Review Request card exists | No request is available | There is no request context to inspect |
| Open Review | A Review Request card or notification has a valid clone route | Clone route is missing or request is unavailable | The annotator must open a specific assigned task |

Additional rules:

- Buttons never silently change status after a failed API response.
- Loading disables only the action currently being submitted.
- Success is communicated through the existing toast/status treatment.
- Admin/Owner actions are never displayed as Annotator actions.

## 20. Search Documentation

Search operates within the current dataset consensus view.

Searchable fields:

- Row number.
- Question text.
- Submitted annotator answer.
- Annotator name.
- Winner value.
- Status label.

Search behavior:

- Matching is case-insensitive.
- Partial text matches are allowed.
- Multiple searchable values in one row are treated as one searchable row record.
- Search updates visible table rows or mobile row cards.
- Search does not change backend data.
- Clearing Search restores the current filter result.
- Changing Search resets pagination to page 1.
- No AI or semantic search is introduced.

## 21. Filter Documentation

| Filter | Values | Behavior |
| --- | --- | --- |
| Status | Agreed, Conflict, Tie, Partial, Review Requested, Pending, Approved where present | Shows rows with the selected status |
| Agreement | Below 70%, 70% and above | Compares numeric agreement percentage |
| Annotator | Assigned annotators only | Shows rows containing that annotator's answer |
| Needs Review | On/Off | Includes Conflict, Tie, Partial, and Review Requested |
| Question | Question text or field label where supported | Shows rows matching the question text |
| Dataset | Current dataset context | Dataset is route-scoped and displayed as context; it is not a cross-dataset selector on this page |

Expected behavior:

- Filters can be combined.
- Clearing a filter removes only that constraint.
- Filter changes reset pagination to page 1.
- Active filters remain visible in the toolbar.
- No matching result shows a scoped empty state rather than fabricated data.
- Filter controls do not create new routes or change the existing Sidebar.

## 22. Pagination Behavior

- Large datasets use the existing consensus grid pagination metadata.
- The page displays current range, current page, total pages, and total row count.
- Default page size follows the existing grid configuration; the current page request uses the existing page-size contract.
- Page switching preserves Search and Filters.
- Changing Search or Filters returns to page 1.
- Previous is disabled on page 1.
- Next is disabled on the final page.
- A page request shows the table loading state without hiding the existing shell.
- An empty page shows `No consensus rows found` and keeps pagination context visible when metadata exists.
- Pagination failures show Retry without changing the previous visible data until replacement data is available.
- Sorting is not a new visible control in the approved UI. If the existing API returns a supported sort order, the page preserves that order; no new sort toolbar is introduced.
- Mobile uses the same page state with touch-sized Previous and Next buttons.

## 23. Responsive Rules

| Area | Desktop | Laptop | Tablet | Mobile |
| --- | --- | --- | --- | --- |
| Table | Full seven-column table | Full table with limited horizontal overflow | Stacked row cards when needed | Stacked row cards only |
| Cards | Summary strip and up to three annotator columns | Compact grid or horizontal summary strip | Two-column cards | One-column cards |
| Drawer | Right-side drawer around 640px | Reduced right-side drawer | Full-height overlay | Full-screen drawer |
| Modal | Centered fixed-width modal | Centered fluid modal | Scrollable centered modal | Full-width inset modal |
| Buttons | Inline groups | Wrapped groups | Two-row groups | Stacked full-width buttons |
| Toolbar | Search and Filters in one row | Search and Filters where space allows | Search above wrapped Filters | Search followed by Filters |
| Spacing | 8px grid with generous section gaps | Reduced horizontal padding | Compact vertical rhythm | 16px page padding and stacked sections |
| Overflow | Table may scroll horizontally only when necessary | Table may scroll horizontally | Content should stack before overflow | No horizontal page overflow |
| Scrolling | Page and drawer scroll independently | Page and drawer scroll independently | Full-height drawer scrolls internally | Full-screen drawer scrolls internally |

## 24. Accessibility Checklist

- Keyboard navigation reaches every actionable element.
- Tab order follows shell, breadcrumb, header actions, summary cards, annotator cards, toolbar, rows, drawer, and modal content.
- Search and Filter controls have visible focus states.
- Status badges include text and do not rely on color alone.
- Icon-only controls have explicit ARIA labels.
- Table headers are associated with table cells.
- Row actions include row context in accessible names where needed.
- Opening a drawer moves focus into the drawer.
- Drawer focus is trapped while the drawer is modal and no unsafe submission is in progress.
- Escape closes the drawer when safe and returns focus to the trigger.
- Opening a modal moves focus to its title or first meaningful control.
- Modal focus is trapped while open.
- Escape closes a modal when no submission is in progress.
- Closing a modal returns focus to the triggering button.
- Loading regions expose an accessible busy state.
- Toasts, validation messages, and status changes use an accessible live region.
- Review Again required fields expose programmatic labels and errors.
- Collaborative Review submission state is announced.
- Disabled buttons expose disabled state and remain readable.

## 25. Final UI Checklist

- [x] Existing Sidebar reused.
- [x] Existing Top Navigation reused.
- [x] No AI Copilot.
- [x] No AI Judge.
- [x] No AI Suggestions.
- [x] No Bulk Actions.
- [x] No Override Winner.
- [x] No Reject workflow.
- [x] Existing Review Consensus route reused.
- [x] Existing consensus APIs reused.
- [x] Existing Annotation page reused for Annotators.
- [x] Existing clone dataset workflow reused.
- [x] Review Again documented.
- [x] Collaborative Review documented.
- [x] Responsive behavior documented.
- [x] Exactly one through nine annotators documented.
- [x] Loading, Empty, and Error states documented.
- [x] Search and Filters documented.
- [x] Pagination documented.
- [x] Accessibility behavior documented.
- [x] No additional UI feature is proposed.

## Current Workflow Override

The current Admin Review Consensus implementation does not expose Collaborative Review.

- Expanded row actions are Approve, Review Again, and Export Row.
- Review Again sends a request to selected Annotators.
- Admin and Annotators discuss outside the application when needed.
- Annotators submit the revised answer through the existing annotation workflow.
- The Collaborative Review modal, button, and session navigation are not part of the Admin page.
- Review Again uses an Admin-assigned date, time, and timezone deadline.
- Deadline values are persisted as UTC by the backend and displayed in the request timezone.
- Annotators may submit after the deadline; late submissions are recorded for Admin visibility.
