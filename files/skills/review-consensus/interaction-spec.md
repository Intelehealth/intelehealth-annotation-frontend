# Review Consensus Interaction Specification

## Page Loading

- Load the consensus grid and annotator progress for the current dataset.
- Show a loading state inside the table and progress section.
- Show an empty state when no rows or annotators are available.
- Never show fabricated consensus values in the production data state.

## Error State

- If the consensus grid fails, keep the existing shell visible and show an inline error state inside the table region.
- The error state includes a short explanation and a Retry action.
- If annotator progress fails but the grid succeeds, keep the table usable and show the progress section error independently.
- Failed Review Again, approval, export, or collaborative-session requests show an error toast without silently changing the row status.

## Empty State

- If there are no assigned annotators, show `No annotators assigned` in the progress section.
- If there are no consensus rows, show `No consensus rows found` in the table region.
- Empty states keep Search and Filters available but do not show fabricated example rows.

## Pagination For Large Datasets

- Use server-side pagination for datasets larger than the current page size.
- The grid request carries `page`, `pageSize`, `status`, `search`, and supported filter values.
- Show the current page, total pages, and total row count below the table.
- Default page size is 50 rows unless the existing API configuration specifies another value.
- Changing page preserves the current filters and search query.
- Changing search or filters resets the page to page 1.
- Row drawer state closes when navigating to a different page.
- Mobile cards use the same pagination data and do not load the entire dataset into the browser.

## Exactly One Through Nine Annotators

- The page supports exactly 1, 2, 3, 4, 5, 6, 7, 8, and 9 assigned annotators.
- Annotator cards are rendered from API data, not from a fixed three-person layout.
- Answer sections render one through nine annotator answer cards without changing the workflow.
- The clone relationship maps one physical clone dataset to each assigned annotator.

## Search And Filters

- Search rows, questions, answers, winners, and annotator names.
- Status options are Agreed, Conflict, Tie, Partial, Review Requested, and Pending.
- Agreement options are Below 70% and 70% or above.
- Annotator selection is limited to annotators assigned to the dataset.
- Needs Review includes Conflict, Tie, Partial, and Review Requested rows.

## Row Drawer

- Clicking a question, row card, or Review opens the drawer.
- Clicking outside the drawer or the close button closes it.
- The drawer remains usable at one, three, six, or nine annotators.
- Annotator answers stack vertically when there is not enough horizontal space.

## Approve

- Approve is available from the row drawer.
- Persist the consensus decision through the existing consensus API when a review ID and final answer are available.
- Update the visible row status to Approved after success.
- Show a success toast.

## Review Again

- Review Again opens the modal for the active row.
- Comment is required.
- At least one annotator is required.
- Deadline is required.
- Select all toggles all assigned annotators.
- Send Review Request updates the row status to Review Requested after the request succeeds.
- Show a success toast after sending.

## Collaborative Review

- Start Collaborative Review opens the modal for the current consensus context.
- Participants are drawn from assigned annotators.
- A snapshot and collaborative session are created through existing APIs.
- On success, navigate to the existing review session route using the returned share code.

## Clone And Field Relationship

- The parent dataset owns the source row.
- Each assigned annotator works in a physical clone dataset.
- Consensus compares matching row indices across those clones.
- Field-level answers are aggregated into row-level status and decision state.

## Existing Shell

- Reuse the existing Sidebar without changing its structure or styling.
- Reuse the existing TopNav without changing its structure or styling.
- The Review Consensus route adds page content only below the existing shell.

## Annotator Review Request Documentation Boundary

- The Annotator wireframe is documentation-only.
- Review Request cards are read-only until the existing Annotation route opens.
- Notification clicks navigate to the assigned clone dataset annotation route.
- Only requested rows are highlighted.
- Only requested fields unlock for field-level requests.
- Entire requested rows unlock for row-level requests.
- Previous answers, confidence, submitted time, and Admin comments are read-only.
- Submit Re-Annotation is the only final Annotator action.
- Annotators never access Review Consensus, Approve, Review Again, or Collaborative Review actions.

## Export

- Export downloads the dataset consensus report.
- Export Row uses the existing consensus export endpoint with the row export type.
- Show success and error toasts through the existing toast provider.
