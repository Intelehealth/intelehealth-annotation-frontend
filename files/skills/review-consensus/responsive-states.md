# Review Consensus Responsive States

## Desktop

- Keep the existing sidebar visible.
- Use a wide table with seven columns.
- Render annotator cards in up to three columns.
- Open row details as a right-side drawer.

## Laptop

- Keep the existing sidebar visible.
- Allow the summary cards to scroll horizontally.
- Keep the table horizontally scrollable only when required.
- Keep the row drawer at approximately 560 to 640 pixels.

## Tablet

- Preserve the existing navigation behavior.
- Use two summary card columns where needed.
- Use two annotator card columns.
- Render consensus rows as stacked cards if the table becomes too narrow.
- Render the drawer as a full-height overlay.

## Mobile

- Keep the existing top navigation and sidebar behavior.
- Use two-column summary cards or a horizontal summary strip.
- Stack annotator cards vertically.
- Use a single search field followed by a Filters button.
- Render each consensus row as a compact card.
- Render row details as a full-screen drawer.
- Stack action buttons vertically when necessary.

## Annotator Count Matrix

| Annotators | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| 1 | One card | One card | One stacked card |
| 2 | Two cards | Two cards | Two stacked cards |
| 3 | Three cards | Two plus one | Three stacked cards |
| 4 | Two by two | Two by two | Four stacked cards |
| 5 | Three plus two | Two columns | Five stacked cards |
| 6 | Three by two | Two columns | Six stacked cards |
| 7 | Four plus three | Two columns | Seven stacked cards |
| 8 | Four by two | Two columns | Eight stacked cards |
| 9 | Three by three | Two columns | Nine stacked cards |

## State Behavior Across Breakpoints

- Loading uses the same inline table and progress skeleton at every width.
- Empty states remain centered inside the section that is empty.
- Error states keep Retry close to the failed section.
- Pagination remains visible below the table on desktop, tablet, and mobile.
- The row drawer is a right-side drawer on desktop and a full-screen drawer on tablet and mobile.
- The existing Sidebar and TopNav remain the only application shell elements.

## Responsive Behavior Table

| Element | Desktop | Laptop | Tablet | Mobile |
| --- | --- | --- | --- | --- |
| Grid layout | Wide page with three-column annotator grid | Wide page with compact three-column grid | Two-column content sections | Single-column content sections |
| Drawer | Right-side drawer, approximately 640px | Right-side drawer with reduced width | Full-height overlay | Full-screen drawer |
| Cards | Summary cards in horizontal strip; annotator cards in up to three columns | Summary strip may scroll horizontally | Summary cards wrap into two columns | Summary cards use two columns or horizontal strip |
| Table | Full seven-column consensus table | Full table with limited horizontal scroll | Stacked row cards if table is too narrow | Stacked row cards |
| Buttons | Inline row actions and modal footer actions | Inline where space allows | Wrapped action groups | Full-width or stacked actions |
| Toolbar | Search and filters in one row | Search and filters in one row where possible | Search above wrapped filters | Search followed by Filters control |
| Search | Full-width or flexible toolbar input | Flexible toolbar input | Full-width input | Full-width input |
| Filters | Inline controls | Inline controls | Wrapped controls | Expanded filter area or existing filter surface |
| Annotator Cards | One through nine in up to three columns | One through nine in compact grid | Two columns | One stacked column |
| Status Cards | Seven summary cards in horizontal strip | Horizontal strip or wrapped cards | Two-column grid | Two-column grid or horizontal strip |
| Pagination | Below table with page and totals | Below table with page and totals | Below cards/table | Below cards with large touch targets |
