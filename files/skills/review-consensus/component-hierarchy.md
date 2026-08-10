# Review Consensus Component Hierarchy

This is a documentation map of the current simplified page. It does not require new components or a redesign of the existing shell.

| Component | Main props | Local state | Responsibility | Reusability |
| --- | --- | --- | --- | --- |
| `ReviewConsensusPage` | `datasetId`, authenticated user context | Rows, progress, loading, filters, active row, modal state | Own page data loading, permissions, orchestration, and action handlers | Page-specific coordinator |
| `Sidebar` | Existing component props | Existing sidebar state | Existing platform navigation and shell | Shared platform component; unchanged |
| `TopNav` | `onRefresh`, `refreshing`, children | Existing scroll state | Existing top navigation and mobile shell | Shared platform component; unchanged |
| `Breadcrumb` | Dataset context and route labels | None | Shows Organizations, Workspace, Project, Dataset, Review Consensus | Small presentational component |
| `Summary Cards` | Label, value, status accent, icon | None | Shows Total Rows, Agreed, Conflict, Tie, Partial, Review Requested, Annotator Progress | Reusable `StatCard` pattern |
| `Annotator Cards` | Annotator identity, assigned rows, completed rows, pending rows, agreement, online status | None | Shows progress for one through nine annotators | Reusable per annotator |
| `Toolbar` | Search value, filters, callbacks | Search/filter controls | Searches and filters current consensus rows | Reusable within consensus views |
| `Consensus Table` | Rows, open-row callback, pagination metadata | None | Desktop comparison view | Consensus-page component |
| `Row Card` | A normalized review row, open-row callback | None | Tablet/mobile replacement for the table | Reusable responsive row representation |
| `Status Badge` | Status value | None | Renders readable status label and color | Reusable across cards, rows, and drawer |
| `Drawer` | Active row, close callback, action callbacks | Text entry for comments/notes if enabled | Shows document preview, question, answers, comments, and admin notes | Row-review component |
| `Review Again Modal` | Active row, annotators, form values, callbacks | Reason, comment, deadline, selected annotators | Validates and previews a review request | Workflow modal |
| `Collaborative Review Modal` | Annotators, title, topic, callbacks | Meeting title and topic | Creates an existing collaborative review session | Workflow modal |
| `Loading Skeletons` | Section dimensions | None | Communicates pending grid/progress requests | Reusable loading presentation |
| `Empty State` | Title, description, compact mode | None | Communicates no rows, annotators, or clone data | Reusable state presentation |
| `Error State` | Message, retry callback, affected section | None | Shows recoverable API errors without hiding the shell | Reusable state presentation |

## Composition

```text
ReviewConsensusPage
├── Sidebar
├── TopNav
├── Breadcrumb
├── Header controls
├── Summary Cards
├── Annotator Cards
├── Toolbar
├── Consensus Table
│   └── Row Card on narrow layouts
├── Drawer
├── Review Again Modal
└── Collaborative Review Modal
```

The existing Sidebar and TopNav are reused as-is. No new shell component is planned.
