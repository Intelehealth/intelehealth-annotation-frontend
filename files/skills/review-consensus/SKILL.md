# Review Consensus UI Skill

## Purpose

This project skill defines the focused Review Consensus workflow for Latent Annotate. It is for Organization Owners and Admins comparing annotations from one to nine annotators.

## Scope

The page may contain:

- The existing Latent Annotate sidebar and top navigation.
- The Review Consensus breadcrumb.
- Refresh, Export, Search, and Filters.
- Total Rows, Agreed, Conflict, Tie, Partial, Review Requested, and Annotator Progress cards.
- Annotator progress cards for one through nine annotators.
- The consensus comparison table.
- The row details drawer.
- Approve, Review Again, and Export Row.
- The Review Again modal.

The page must not contain AI Copilot, AI Judge, AI Suggested Winner, AI Recommendation, bulk delete, bulk approve, override winner, reject, history timeline, vote distribution, productivity metrics, average annotation time, advanced analytics, extra toolbars, or a new sidebar design.

## Interaction Rules

- A table row opens the row details drawer.
- The drawer is the only place for row-level actions.
- Review Again requires a reason, comment, at least one annotator, and a deadline.
- Review Again changes the row to Review Requested after a successful request.
- Annotator discussion after Review Again occurs outside the application; no Collaborative Review UI is exposed on this page.
- Search and filters operate only on consensus rows.
- The number of annotator cards is data-driven and must support one through nine.
- The complete row lifecycle is Pending, Partial, Agreed, Conflict, Tie, Review Requested, Re-Submitted, and Approved.
- Field-level consensus is aggregated into the row-level status shown in the table.
- Parent rows are compared across physical clone datasets assigned to one through nine annotators.
- Large datasets use server-side pagination and retain the current page, filters, and search query when navigating.
- Loading, empty, and error states are explicit and must not be replaced with fabricated production values.

## Visual Rules

- Reuse the existing design system components and spacing scale.
- Keep the sidebar and top navigation unchanged.
- Use green for Agreed, orange for Conflict, red for Tie, blue for Partial, purple for Review Requested, and gray for Pending.
- Prefer white surfaces, subtle borders, restrained shadows, and generous whitespace.
- Do not introduce a secondary analytics rail or competing dashboard surface.
- Reuse the existing Sidebar and TopNav components without modifying their design.
- Permission boundaries are documented separately for Admin, Owner, and Annotator.
- UI state and state-transition matrices are documented separately from implementation.
