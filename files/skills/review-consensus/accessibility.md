# Review Consensus Accessibility

## Keyboard Navigation

- All links, buttons, inputs, selects, checkboxes, rows, drawer controls, and modal controls are keyboard reachable.
- Tab order follows the visual order from the existing shell through page content.
- Table row actions are reachable without requiring pointer interaction.
- The active row remains identifiable when focus moves into the drawer.

## Tab Order

```text
Existing Sidebar / TopNav controls
→ Breadcrumb links
→ Header Export
→ Summary cards when interactive
→ Annotator cards when interactive
→ Search
→ Filters
→ Table row actions
→ Drawer or modal controls
```

## Focus States

- Every interactive control has a visible focus ring.
- Focus styling must remain visible against white cards and colored status surfaces.
- Focus must not rely on color alone.
- Disabled buttons remain visibly disabled and are not keyboard targets.

## ARIA Labels

Icon-only controls require labels:

- Search.
- Filters.
- Refresh when icon-only.
- Close drawer.
- Close modal.
- Previous and next pagination.
- More row actions if retained by the existing table.

Status badges must include readable text such as `Conflict`, `Tie`, or `Review Requested`. Color is supplementary.

## Drawer

- Treat the row drawer as a dialog or complementary landmark.
- Move focus to the drawer heading or close control when it opens.
- Escape closes the drawer.
- Clicking outside closes the drawer only when it does not discard unsaved input.
- Return focus to the row action that opened the drawer.

## Modal

- Use a modal dialog label and description.
- Trap focus while the modal is open.
- Escape closes the modal when no submission is in progress.
- Return focus to the triggering action after close.
- Required Comment, Deadline, and Annotator Selection errors must be announced.

## Enter And Space

- Enter activates focused buttons, links, and row-open controls.
- Space toggles focused checkboxes and supported buttons.
- Enter in a search field submits or applies search according to the existing toolbar behavior.
- Enter must not submit Review Again until all required fields are valid.

## Screen Readers

- Loading regions expose an `aria-busy` state.
- Error and success messages use an accessible live region.
- Tables expose column headers and row context.
- Annotator cards expose name, assigned, completed, pending, agreement, and online status in one readable label.
- Drawer and modal headings are announced on open.
- Status changes such as Review Requested, Re-Submitted, and Approved are announced after successful API responses.
