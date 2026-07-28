# Review Consensus Tasks

## Completed In This Pass

- [x] Reuse the existing Sidebar.
- [x] Reuse the existing TopNav.
- [x] Add the requested Review Consensus breadcrumb.
- [x] Keep only Refresh, Export, Search, and Filters in the page controls.
- [x] Keep only the seven requested summary cards.
- [x] Support one through nine data-driven annotator cards.
- [x] Keep the consensus table focused on row, question, answers, winner, agreement, status, and actions.
- [x] Remove AI Copilot and AI-specific recommendation surfaces.
- [x] Remove bulk actions and unrelated row actions.
- [x] Remove history timeline and vote distribution UI.
- [x] Add the focused row details drawer.
- [x] Add the focused Review Again modal.
- [x] Add the focused Collaborative Review modal.
- [x] Add responsive table and stacked card states.
- [x] Add Review Consensus wireframe and interaction documentation under files/skills/review-consensus.
- [x] Document the complete row status lifecycle.
- [x] Document the admin decision matrix.
- [x] Document Review Again from admin request through annotator re-submission.
- [x] Add the annotator notification wireframe.
- [x] Add the parent dataset to clone dataset relationship diagram.
- [x] Document field-level versus row-level review.
- [x] Add the complete admin and annotator sequence diagram.
- [x] Document the Collaborative Review workflow.
- [x] Document responsive behavior and the 1–9 annotator matrix.
- [x] Document loading, empty, and error states.
- [x] Document server-side pagination for large datasets.
- [x] Explicitly document existing Sidebar and TopNav reuse without modification.
- [x] Run focused Review Consensus Playwright coverage: 5/5 passed.
- [x] Update the Playwright readiness URL to use `/login` instead of the 404 root route.
- [x] Run the project-configured Review Consensus Playwright test: 1/1 passed.
- [x] Document full build, type, lint, focused Playwright, and full Playwright results.
- [x] Add the complete UI State Matrix documentation.
- [x] Add the Review Consensus component hierarchy documentation.
- [x] Add frontend state management documentation.
- [x] Add the complete existing API mapping table.
- [x] Add the responsive behavior table.
- [x] Add accessibility documentation.
- [x] Add Admin and Annotator user journey documentation.
- [x] Expand acceptance criteria for all requested frontend states and components.
- [x] Add the dedicated Annotator Review Request wireframe and interaction specification.
- [x] Remove Collaborative Review from the Admin Review Consensus UI scope; use external discussion after Review Again.
- [x] Persist Review Again row, field, annotator, reason, comment, deadline, and timezone metadata through the existing consensus workflow.
- [x] Add structured Review Requested notifications and Annotator Tasks request cards.
- [x] Connect notification clicks to the assigned clone annotation route.
- [x] Connect clone annotation submission to Review Request Re-Submitted state.
- [x] Use a soft deadline: late Annotator submissions remain allowed and are recorded as late.

## Verification

- [ ] Verify the page with one annotator.
- [ ] Verify the page with two annotators.
- [ ] Verify the page with three annotators.
- [ ] Verify the page with four annotators.
- [ ] Verify the page with five annotators.
- [ ] Verify the page with six annotators.
- [ ] Verify the page with seven annotators.
- [ ] Verify the page with eight annotators.
- [ ] Verify the page with nine annotators.
- [ ] Verify Review Again validation and success state.
- [ ] Verify Collaborative Review creation and navigation.
- [ ] Verify row export and dataset export.
- [ ] Verify desktop, laptop, tablet, and mobile layouts.
- [ ] Run TypeScript validation.
- [ ] Run the production build.
- [x] Run the existing consensus Playwright coverage.

## Validation Notes

- [x] Production build passed.
- [x] Focused Review Consensus ESLint passed.
- [x] Focused Review Consensus Playwright suite passed: 5/5.
- [ ] Full project TypeScript check remains blocked by pre-existing unrelated errors.
- [ ] Full Playwright suite remains blocked by existing backend rate limiting, statistics login setup, and unrelated negative-scenario contract failures.
- [x] Full details are recorded in `files/skills/review-consensus/test-report.md`.

## Scope Guardrails

- [ ] Do not add AI Copilot.
- [ ] Do not add AI Suggested Winner.
- [ ] Do not add AI Judge.
- [ ] Do not add AI Recommendation.
- [ ] Do not add bulk delete.
- [ ] Do not add bulk approve.
- [ ] Do not add override winner.
- [ ] Do not add reject.
- [ ] Do not add history timeline.
- [ ] Do not add vote distribution.
- [ ] Do not add productivity metrics.
- [ ] Do not add average annotation time.
- [ ] Do not add advanced analytics.
- [ ] Do not add extra toolbars.
- [ ] Do not redesign the sidebar or top navigation.

---

# Workspace Management UI Integration Plan

## Purpose

This is the implementation checklist for the Workspace Management frontend described in the Workspace Management PRD and Stitch design reference.

```text
Workspace Templates
  -> Configure Workspace or Create Custom Workspace
  -> Workspace Dashboard
  -> Projects Listing
  -> Project Dashboard
  -> Dataset Dashboard
  -> Agentic Dataset Analytics
```

The first delivery is frontend-first. Workspace and Project backend resources do not currently exist in this repository, so the UI must use typed demo data and repository adapters until backend endpoints are available. Existing dataset, upload, annotation, consensus, statistics, user, and export APIs must continue to work unchanged.

## Repository Constraints

- [ ] Preserve the existing `/dataset` and `/dataset/[datasetId]` workflow.
- [ ] Preserve the existing annotation, consensus, and statistics routes.
- [ ] Do not replace the current CSV upload flow before the new upload adapter is verified.
- [ ] Do not invent production Workspace API calls that the backend does not expose.
- [ ] Mark demo-only values such as AI accuracy, OCR accuracy, and Copilot responses clearly.
- [ ] Do not overwrite existing working-tree changes on `feature/annotation-ui-integration`.
- [ ] Keep Workspace routes prefixed with `/workspaces` to avoid route collisions.

## Branch Preparation

- [ ] Review `git status --short --branch` before creating a branch.
- [ ] Review the current uncommitted annotation and consensus changes.
- [ ] Confirm whether the work should be pushed to `feature/annotation-ui-integration` or the PRD branch `feature/workspace-management`.
- [ ] If following the PRD branch plan, create `feature/workspace-management` from `feature/nested-conditional-questions`.
- [ ] Create `feature/fintech-document-compliance` only after Workspace Management is complete.
- [ ] Do not use `git reset --hard` or `git checkout --` to clean the worktree.

## Route Plan

- [ ] Add `/workspaces` for Workspace Templates.
- [ ] Add `/workspaces/new/template/[templateId]` for template configuration.
- [ ] Add `/workspaces/new/custom` for manual workspace creation.
- [ ] Add `/workspaces/[workspaceId]` for Workspace Dashboard.
- [ ] Add `/workspaces/[workspaceId]/projects` for Projects Listing.
- [ ] Add `/workspaces/[workspaceId]/projects/[projectId]` for Project Dashboard.
- [ ] Add `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]` for Dataset Dashboard.
- [ ] Add `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics` for Dataset Analytics.
- [ ] Add `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics/cases/[caseId]` if direct case navigation is needed.
- [ ] Keep `/dataset/[datasetId]/statistics` as the detailed consensus statistics screen.
- [ ] Link new Workspace screens to existing annotation, consensus, upload, field configuration, and statistics routes.

## Proposed File Structure

- [ ] Add Workspace routes under `src/app/workspaces`.
- [ ] Add shared Workspace components under `src/components/workspace`.
- [ ] Add creation components under `src/components/workspace-management`.
- [ ] Add project components under `src/components/project`.
- [ ] Add dataset dashboard components under `src/components/dataset-workspace`.
- [ ] Add analytics components under `src/components/analytics`.
- [ ] Add typed Workspace data under `src/lib/workspace`.
- [ ] Add future API adapters under `src/lib/api/workspace.ts`, `project.ts`, and `analytics.ts`.

## Types and Data Layer

- [ ] Create Workspace, WorkspaceTemplate, Project, WorkspaceDataset, Module, PipelineStage, DocumentSummary, DatasetAnalytics, CaseReview, AIInsight, and ReviewQuestion types.
- [ ] Define a `WorkspaceRepository` interface.
- [ ] Add methods for template listing, workspace creation, workspace loading, project listing, project creation, dataset loading, analytics loading, case loading, and review submission.
- [ ] Create a deterministic demo repository implementation.
- [ ] Create a future API repository adapter without calling unavailable endpoints.
- [ ] Create browser-safe demo storage with `localStorage`.
- [ ] Persist created demo workspaces and projects across navigation.
- [ ] Persist selected template, enabled modules, document types, and draft form values.
- [ ] Keep demo state separate from real dataset API state.
- [ ] Display a demo indicator when values are not backed by an API.

## Workspace Shell and Navigation

- [ ] Add `src/app/workspaces/layout.tsx` with authentication protection.
- [ ] Reuse the existing `Sidebar`.
- [ ] Reuse the existing mobile `Sheet` navigation.
- [ ] Reuse the existing `TopNav`.
- [ ] Add a Workspaces link for administrators without removing Datasets.
- [ ] Add Workspace breadcrumbs.
- [ ] Add Workspace name or Workspace switcher context in the header.
- [ ] Add loading, error, and not-found states.
- [ ] Verify the shell on desktop, tablet, and mobile.
- [ ] Ensure the shell does not change annotator-only navigation.

## Page 1: Workspace Templates

Route: `/workspaces`

- [ ] Add `Industry Workspaces` heading.
- [ ] Add All Industries, Healthcare, Financial Services, and Legal & Risk tabs.
- [ ] Add Healthcare template card.
- [ ] Add Banking template card.
- [ ] Add Custom Workspace card.
- [ ] Add industry label, sub-label, setup time, and compliance badges.
- [ ] Add `Use Template` buttons.
- [ ] Add `Start Manual Setup` button.
- [ ] Add selected-template detail panel.
- [ ] Add module tabs and Pipeline Lifecycle list.
- [ ] Add Upload, OCR, Classification, Field Extraction, Annotation, Consensus, Analytics, and Reports stages.
- [ ] Add `Use Healthcare Template` primary action.
- [ ] Add card skeleton state.
- [ ] Add filter empty state.
- [ ] Reflow cards to one column on mobile.
- [ ] Move detail panel below the grid on tablet and mobile.
- [ ] Verify filters, selection, and CTA navigation.

## Page 2: Configure Healthcare Workspace

Route: `/workspaces/new/template/healthcare`

- [ ] Add Workspace Name.
- [ ] Add Description.
- [ ] Add Workspace Logo upload.
- [ ] Add Theme Color with Healthcare default.
- [ ] Add Visibility select.
- [ ] Add PDF, DOCX, PPTX, CSV, ZIP, Images, JSON, and TXT checkboxes.
- [ ] Add selected document type count.
- [ ] Add validation when no document type is selected.
- [ ] Add OCR Engine, LLM Extraction, NER, and PII Redaction toggles.
- [ ] Add module descriptions and status badges.
- [ ] Add ordered Workflow Stages beginning with Ingestion.
- [ ] Add Live Workspace Preview.
- [ ] Add preview KPI tiles, navigation mapping, trend chart, and Healthcare Copilot preview.
- [ ] Update the preview immediately when modules or document types change.
- [ ] Disable Create Workspace until name and document type requirements pass.
- [ ] Add Save Draft, Back to Templates, and Create Workspace.
- [ ] Route successful creation to the Workspace Dashboard.
- [ ] Add preview loading state.
- [ ] Stack the three-column layout on mobile.

## Page 3: Create Custom Workspace

Route: `/workspaces/new/custom`

- [ ] Add Workspace Name and Description.
- [ ] Add collapsible Organization, Security, and AI Defaults sections.
- [ ] Add searchable Module Marketplace.
- [ ] Add All Modules, Intelligence, Annotation, and Automation filters.
- [ ] Add Neural OCR, Table Detection, LLM Extraction, RAG Engine, Human-in-Loop, and NER Tagger cards.
- [ ] Add add/remove module actions.
- [ ] Add Active, Core, and Recommended badges.
- [ ] Add marketplace spinner while filtering.
- [ ] Add `No modules match your search` state.
- [ ] Add sample document live preview.
- [ ] Add accuracy and speed preview statistics.
- [ ] Add Upload, Ingest, Intelligence Hub, OCR, LLM, Expert Review, and Consensus flow nodes.
- [ ] Update the flow immediately when modules change.
- [ ] Require one Document Intelligence module before Create Workspace is enabled.
- [ ] Add Save Draft, Back, and Create Workspace.
- [ ] Collapse Live Preview into an expandable mobile panel.

## Page 4: Workspace Dashboard

Route: `/workspaces/[workspaceId]`

- [ ] Add workspace name and Active Cluster badge.
- [ ] Add HIPAA, SOC2, ISO27001, and GDPR badges.
- [ ] Add Edit, Settings, and Export actions.
- [ ] Add Active Projects, Datasets, Documents Processed, AI Accuracy, Consensus Pending, and Failed Documents KPIs.
- [ ] Mark unavailable AI and OCR values as `Demo data` or `Not available`.
- [ ] Add Upload, OCR, Classification, Extraction, and Validation pipeline.
- [ ] Add Deep Intelligence Search input and suggestions.
- [ ] Add Recent Ingested Files list with file status.
- [ ] Add Active Workspace Projects table.
- [ ] Add Workspace Health, Configuration Summary, and Live Audit Stream.
- [ ] Link failed-document count to filtered documents.
- [ ] Link every project row to Project Dashboard.
- [ ] Add skeleton KPI and pipeline states.
- [ ] Add `No active projects yet` empty state.
- [ ] Wrap KPIs on tablet and stack them on mobile.
- [ ] Move the right column below main content on mobile.

## Page 5: Projects Listing

Route: `/workspaces/[workspaceId]/projects`

- [ ] Add search, Create Project, Import Project, grid/list toggle, Filter, and Sort.
- [ ] Add project code, name, status, domain tags, dataset count, member count, progress, avatars, and updated time.
- [ ] Add Active, Paused, and Completed status badges.
- [ ] Add Platform Summary with Total, Running, and Completed projects.
- [ ] Add System Throughput with datasets, documents, consensus, and pending reviews.
- [ ] Add Recent Activity feed.
- [ ] Update search, filters, and sort without a full reload.
- [ ] Make every project card clickable.
- [ ] Add project card skeleton state.
- [ ] Add `No projects yet` empty state.
- [ ] Narrow grid to one column on mobile.
- [ ] Move summary below the project list on mobile.

## Page 6: Project Dashboard

Route: `/workspaces/[workspaceId]/projects/[projectId]`

- [ ] Add breadcrumb and System Status.
- [ ] Add Total Datasets, Medical Records, Documents Processed, AI Accuracy, OCR Accuracy, and Review Queue KPIs.
- [ ] Add Completed, In Review, Consensus, Pending, and Returned progress segments.
- [ ] Verify the breakdown always sums to total documents.
- [ ] Add Upload, Enhancement, OCR, Extraction, Classification, and Validation pipeline.
- [ ] Add Patient Admission Forms, Lab Reports, and Discharge Summaries dataset cards.
- [ ] Add dataset status, document count, progress, and Quick Open.
- [ ] Add Medical AI Assistant and suggested queries.
- [ ] Add Assign Staff, Retry OCR, Review Queue, and Compliance quick actions.
- [ ] Add System Health panel.
- [ ] Add `No datasets in this project yet` state.
- [ ] Stack dataset cards on mobile.
- [ ] Collapse AI Assistant into a mobile drawer.

## Page 7: Dataset Dashboard

Route: `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]`

- [ ] Add dataset header with name, Active, owner, created date, and document count.
- [ ] Add Upload Documents, Analytics, Export, and Settings actions.
- [ ] Add Total Docs, Annotated, Pending Review, Completed, and Failed KPIs.
- [ ] Add Upload, Image Processing, OCR Stage, Validation, and Annotation stepper.
- [ ] Add Document Repository table with filename, type, status, annotator, and updated time.
- [ ] Add search, filter, sort, and refresh.
- [ ] Add row selection and select-all behavior.
- [ ] Add Assign Annotator, Export Data, and Delete bulk actions.
- [ ] Add Operational Search, Saved Queries, Quick Actions, and Dataset Information.
- [ ] Add document row skeleton state.
- [ ] Add `No documents uploaded yet` state.
- [ ] Use existing dataset and progress APIs when the dataset maps to a backend ID.
- [ ] Make the repository scrollable or card-based on mobile.
- [ ] Move the right column below the repository on mobile.

## Upload Integration

- [ ] Preserve `CSVUploadComponent` and `DatasetUploadComponent`.
- [ ] Use `CSVImportsAPI.getByDataset` for CSV history.
- [ ] Use `DatasetMergedRowsAPI.getAnnotationProgress` for progress.
- [ ] Add Workspace drag-and-drop upload UI.
- [ ] Add Browse Files action.
- [ ] Add PDF, DOCX, PPTX, CSV, ZIP, Images, JSON, and TXT display.
- [ ] Validate extension, MIME type, file size, duplicate names, and batch size.
- [ ] Add per-file upload progress.
- [ ] Add per-file processing stage.
- [ ] Add retry and remove actions.
- [ ] Add final validation summary.
- [ ] Reject the complete batch when all-or-nothing validation is required.
- [ ] Do not silently perform partial uploads.
- [ ] Use real backend integration for CSV first.
- [ ] Use a clearly labeled demo adapter for non-CSV files until backend endpoints exist.
- [ ] Define future upload job, polling, retry, cancel, error, and document mapping contracts.

## Page 8: Agentic Dataset Analytics

Route: `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics`

- [ ] Add workspace, project, and dataset breadcrumbs.
- [ ] Add selected case identifier, Previous Case, and Next Case.
- [ ] Add AI confidence, Save Draft, Export PDF, and Submit Review.
- [ ] Add dataset completion, consensus agreement, review queue, average AI confidence, and most-conflicting-field summary.
- [ ] Add Healthcare View, Raw Fields, and Original Document tabs.
- [ ] Add identification, vitals/status, extracted fields, free-text excerpt, history, and references.
- [ ] Add Annotation Intelligence panel.
- [ ] Add AI Suggested Answer, reasoning, confidence, Accept, Reject, review questions, and agreement differences.
- [ ] Ensure Accept only pre-fills the reviewer's own answer.
- [ ] Ensure Reject clears the suggestion from the reviewer's answer.
- [ ] Ensure AI cannot submit, resolve consensus, or overwrite source data.
- [ ] Disable Submit Review until every required question has an answer.
- [ ] Return to Dataset Dashboard after successful submission.
- [ ] Add generating, no-suggestion, and AI-error states.
- [ ] Put the intelligence panel first on mobile.
- [ ] Add a sticky mobile action bar.

## Analytics Definition

- [ ] Define Total Documents, Processed Documents, Annotated Documents, Pending Review, and Failed Documents.
- [ ] Define Annotation Completion as annotated documents divided by total documents.
- [ ] Define Consensus Agreement as agreed rows divided by total consensus rows.
- [ ] Define Consensus Conflict and Resolution Rate.
- [ ] Define AI Confidence and OCR Accuracy.
- [ ] Define Average Processing Time, Review Queue, Field Conflict Rate, Annotator Completion, and Pipeline Health.
- [ ] Use real values from existing APIs where available.
- [ ] Use `Demo data`, `Not available`, or omission for unsupported metrics.
- [ ] Never present placeholder AI or OCR values as production measurements.

## Existing API Mapping

- [ ] Use `datasetsAPI.getAll` and `datasetsAPI.getById` for existing datasets.
- [ ] Use `CSVImportsAPI.getByDataset` for CSV file history.
- [ ] Use `DatasetMergedRowsAPI.getAnnotationProgress` for dataset progress.
- [ ] Use `DatasetMergedRowsAPI.getDatasetRows` for paginated repository data.
- [ ] Use `consensusAPI.getProgress` and `consensusAPI.getReviews` for consensus data.
- [ ] Use `consensusAPI.getStatistics` for existing session statistics.
- [ ] Use existing export helpers instead of adding duplicate download implementations.
- [ ] Add Workspace and Project API adapters only after backend contracts exist.

## Loading, Empty, Error, and Accessibility States

- [ ] Add template, dashboard, project, dataset, and repository skeletons.
- [ ] Add preview placeholder bars.
- [ ] Add marketplace loading spinner.
- [ ] Add no-template, no-project, no-dataset, no-document, and no-suggestion states.
- [ ] Add retry actions for failed requests.
- [ ] Add upload errors beside the affected file.
- [ ] Add accessible labels and focus management.
- [ ] Verify keyboard navigation, focus rings, dialog focus trap, chart text alternatives, and reduced motion.
- [ ] Verify status is not communicated by color alone.
- [ ] Verify mobile drawers and upload controls are keyboard accessible.

## Testing and Definition of Done

- [ ] Add Playwright coverage for templates, healthcare configuration, custom builder, dashboard, projects, project dashboard, dataset dashboard, uploads, and analytics.
- [ ] Test Accept and Reject behavior.
- [ ] Test disabled Submit Review state.
- [ ] Test case navigation.
- [ ] Test empty, loading, and error states.
- [ ] Test mobile viewport.
- [ ] Run TypeScript validation and production build.
- [ ] Run existing consensus Playwright coverage.
- [ ] Confirm existing annotation and dataset workflows remain available.
- [ ] Confirm all eight Stitch screens are reachable.
- [ ] Confirm every CTA has an action.
- [ ] Confirm upload behavior does not claim unsupported backend functionality.
- [ ] Confirm the AI human-acceptance rule.
- [ ] Update documentation before pushing the branch.

## GitHub Push Checklist

- [ ] Review status and diff.
- [ ] Stage only intended files.
- [ ] Commit with a concise message.
- [ ] Push the selected branch with upstream tracking.
- [ ] Open the pull request against the intended base branch.
