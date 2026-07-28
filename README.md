# Dyno Annotation Platform — Frontend

> **Next.js 15** | Node 26-alpine | Frontend port **3000** | Backend API port **4000**

This folder is the React/Next.js frontend.  
It is a **separate Docker container** from the backend.

**Start the backend first** (`../dyno-annotation-platform-backend-main/`), then start this.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First-time setup](#2-first-time-setup)
3. [Start the frontend container](#3-start-the-frontend-container)
4. [Verify everything is running](#4-verify-everything-is-running)
5. [Stop / restart](#5-stop--restart)
6. [Local development (no Docker)](#6-local-development-no-docker)
7. [Environment variables reference](#7-environment-variables-reference)
8. [Pages & routes](#8-pages--routes)
9. [How the frontend talks to the backend](#9-how-the-frontend-talks-to-the-backend)
10. [Dataset cloning & annotation workflow — frontend flow](#10-dataset-cloning--annotation-workflow--frontend-flow)
11. [Workspace Management UI](#11-workspace-management-ui)
12. [Workspace Upload Integration](#12-workspace-upload-integration)
13. [Analytics Definition](#13-analytics-definition)
14. [Workspace Routes](#14-workspace-routes)
15. [Implementation Phases](#15-implementation-phases)
16. [GitHub Push Commands](#16-github-push-commands)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Docker Desktop | ≥ 4.x | `docker --version` |
| Docker Compose v2 | bundled | `docker compose version` |
| Backend running | — | `curl http://localhost:4000/` |

---

## Downloaded ZIP: Port Configuration Checklist

After downloading the backend and frontend ZIP files, use these port values for a local
development setup. The backend API listens on `4000`; the Next.js frontend listens on `3000`.

| Component | URL / Port | File to check | Required value |
|-----------|------------|---------------|----------------|
| Backend API | `http://localhost:4000` | Backend `.env` or `.env.docker` | `PORT=4000` |
| Frontend | `http://localhost:3000` | Frontend `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:4000` |
| Backend CORS origin | `http://localhost:3000` | Backend `.env` or `.env.docker` | `FRONTEND_URL=http://localhost:3000` |
| Google OAuth callbacks | Backend port `4000` | Backend `.env` or `.env.docker` | Use `/auth/google/callback` and `/auth/google/admin/callback` on port `4000` |

### Backend files

1. For local development, copy `backend/.env.docker.example` to `backend/.env` and set:

   ```env
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
   GOOGLE_ADMIN_CALLBACK_URL=http://localhost:4000/auth/google/admin/callback
   MONGO_URI=mongodb://127.0.0.1:27017/dyno_annotation
   ```

2. For Docker, copy `backend/.env.docker.example` to `backend/.env.docker`. Keep
   `PORT=4000`, the callback URLs on port `4000`, and `FRONTEND_URL=http://localhost:3000`.
   Docker Compose already maps the backend as `4000:4000`.

3. Do not set `FRONTEND_URL` to port `4000`. `FRONTEND_URL` is the browser address of the
   frontend, so it must use port `3000` unless the frontend port is intentionally changed.

### Frontend files

1. Copy `frontend/.env.local.example` to `frontend/.env.local`.
2. Set the API URL to the backend port:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. Do not put `JWT_SECRET`, `ENCRYPTION_KEY`, Google secrets, admin passwords, or SMTP
   passwords in the frontend env file. Those values belong only in the backend env file.
4. The frontend Docker Compose file maps `3000:3000`; open the application at
   `http://localhost:3000`.

### If you intentionally change a port

Port changes must be applied consistently. If the backend port changes, update the backend
`PORT`, Google callback URLs, frontend `NEXT_PUBLIC_API_URL`, Docker port mapping, and any
test or startup URLs. If the frontend port changes, update backend `FRONTEND_URL`, the
frontend Docker port mapping, and the Playwright `baseURL`. Restart or rebuild after changing
these values because `NEXT_PUBLIC_API_URL` is baked into the frontend bundle during a build.

### Recommended startup order

```sh
# Terminal 1: backend
cd backend
npm install
npm run start:dev

# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Verify the backend separately at
`http://localhost:4000/` and Swagger at `http://localhost:4000/api`.

---

## 2. First-time setup

```powershell
# Make sure the BACKEND is running first:
# cd ..\dyno-annotation-platform-backend-main
# docker compose up -d

# Then come back here:
cd "dyno-annotation-platform-front-end-main"

# (Optional) create a local env file for development
copy .env.local.example .env.local     # Windows
# cp .env.local.example .env.local     # Mac / Linux
```

> For **Docker**, you do NOT need `.env.local`.  
> The `NEXT_PUBLIC_API_URL` is passed as a Docker build arg (see below).

---

## 3. Start the frontend container

### Option A — Automated (recommended)

```sh
# Mac / Linux / Git Bash
chmod +x startup.sh
./startup.sh
```

### Option B — Manual (PowerShell)

```powershell
# Build the image and start the container
# NEXT_PUBLIC_API_URL is baked into the JS bundle at build time
$env:NEXT_PUBLIC_API_URL = "http://localhost:4000"
docker compose up --build -d

# Follow logs
docker compose logs -f frontend
```

### Option C — Custom backend URL (e.g. remote server)

```powershell
$env:NEXT_PUBLIC_API_URL = "https://api.yourserver.com"
docker compose up --build -d
```

> ⚠️ **Important**: `NEXT_PUBLIC_API_URL` is **baked into the JavaScript bundle** at build time  
> because Next.js replaces `process.env.NEXT_PUBLIC_*` at build-time, not runtime.  
> If you change the backend URL you must **rebuild** the image.

---

## 4. Verify everything is running

```powershell
docker compose ps
# NAME             STATUS    PORTS
# dyno-frontend    running   0.0.0.0:3000->3000/tcp

# Open in browser
start http://localhost:3000
```

---

## 5. Stop / restart

```powershell
docker compose down           # stop
docker compose up -d          # restart (no rebuild)
docker compose up --build -d  # restart with rebuild
```

---

## 6. Local development (no Docker)

```powershell
# 1. Install dependencies
npm install

# 2. Create env file
# .env.local already exists with: NEXT_PUBLIC_API_URL=http://localhost:4000

# 3. Start dev server with hot reload
npm run dev

# 4. Open browser
start http://localhost:3000
```

---

## 7. Environment variables reference

| Variable | Set Where | Description |
|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | Build arg + runtime env | Base URL of the NestJS backend API |

### Why only one variable?

Next.js bakes `NEXT_PUBLIC_*` variables into the client-side JavaScript at build time.  
All other config (JWT secret, Google credentials) lives **only in the backend** `.env.docker`.  
The frontend never holds secrets.

### `.env.local` for local dev

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### For Docker

Passed as a build arg in `docker-compose.yml`:

```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 8. Pages & routes

| Route | Page | Who can access |
|-------|------|----------------|
| `/login` | Login page (email or Google OAuth) | Public |
| `/dashboard` | Role-based dashboard | ADMIN + ANNOTATOR |
| `/users` | User management (invite, set permissions) | ADMIN only |
| `/dataset` | Dataset list | ADMIN only |
| `/dataset/add-dataset` | Create new dataset + upload CSV | ADMIN only |
| `/dataset/[datasetId]` | Dataset detail + field config + clone | ADMIN only |
| `/dataset/[datasetId]/annotation` | Annotation workbench | ANNOTATOR (assigned clone) |
| `/dataset/[datasetId]/consensus` | Consensus review | ADMIN only |
| `/tasks` | My assigned tasks list | ANNOTATOR only |
| `/profile` | Profile + change password | All |

---

## 9. How the frontend talks to the backend

### API client setup

All API calls go through `src/lib/api.ts` (or similar), which:

1. Reads `NEXT_PUBLIC_API_URL` for the base URL
2. Attaches `Authorization: Bearer <token>` from `localStorage`
3. On 401 → clears token and redirects to `/login`

### Auth flow

```
User clicks "Sign in with Google"
   → GET http://localhost:4000/auth/google
   → Redirected to Google OAuth
   → Google redirects to http://localhost:4000/auth/google/callback
   → Backend returns JWT
   → Frontend stores JWT in localStorage
   → Frontend redirects to /dashboard
```

### Role-based UI split

After login, the `user.role` field in the JWT payload determines what is shown:

| `role` | Dashboard shows | Navigation shows |
|--------|----------------|-----------------|
| `ADMIN` | Dataset stats, user activity, export buttons | Datasets, Users, Reports |
| `ANNOTATOR` | My tasks, progress bar | Tasks, Profile |

---

## 10. Dataset cloning & annotation workflow — frontend flow

This describes what the user does in the UI and what API calls happen behind the scenes.

---

### ADMIN — Upload first CSV (100 rows)

1. Go to **Datasets** → **Add Dataset**
2. Enter name and description → click **Create**
   ```
   POST /datasets  →  { _id: "DATASET_ID" }
   ```
3. On dataset detail page, click **Upload CSV**
4. Select `customers.csv` (100 rows) → click **Upload**
   ```
   POST /csv-processing/upload  →  { csvImportId: "CSV1" }
   POST /csv-processing/add-to-dataset  →  { rowsAdded: 100 }
   ```

---

### ADMIN — Configure annotation fields

1. On the dataset detail page → click **Configure Fields**
2. Add fields (e.g. `sentiment` → dropdown: positive / neutral / negative)
3. Click **Save Field Configuration**
   ```
   POST /field-selection  →  { annotationFields: [...] }
   ```

---

### ADMIN — Clone dataset to annotators

1. On dataset detail page → click **Clone & Assign**
2. Select **User1** and **User2** from the user list
3. Click **Assign**
   ```
   POST /datasets/DATASET_ID/clone-assign
   Body: { annotatorIds: ["USER1_ID", "USER2_ID"] }
   →  { tasksCreated: 2, clones: [...] }
   ```

Each annotator now has their own **private copy** of all 100 rows.

---

### ADMIN — Add more CSV data later (150 new rows)

1. Go to the **parent dataset** (not a clone) → click **Upload More CSV**
2. Select `customers_q2.csv` (150 rows) → click **Upload & Merge**
   ```
   POST /csv-processing/upload  →  { csvImportId: "CSV2" }
   POST /csv-processing/add-to-dataset  →  { rowsAdded: 150 }
   POST /datasets/DATASET_ID/merge-into-clones  →  { merged: 2, rowsAddedPerClone: 150 }
   ```

After this:
- Parent dataset → 250 rows
- User1 clone → 250 rows ✅
- User2 clone → 250 rows ✅

---

### ANNOTATOR — See and annotate all 250 rows

1. Annotator logs in → goes to **My Tasks**
   ```
   GET /datasets/my-tasks
   →  [{ _id: "CLONE_A", totalRows: 250, progress: 0% }]
   ```
2. Clicks on the task → opens **Annotation Workbench**
   ```
   GET /dataset-merged-rows/CLONE_A?page=1&limit=50
   →  { rows: [...50 rows], totalRows: 250, hasMore: true }
   ```
3. For each row, fills in the annotation fields → clicks **Save**
   ```
   PATCH /dataset-merged-rows/CLONE_A/row/1
   Body: { "sentiment": "positive" }
   →  { success: true }
   ```
4. Progress bar updates automatically:
   ```
   GET /dataset-merged-rows/CLONE_A/progress
   →  { completed: 1, total: 250, percentage: 0.4 }
   ```
5. When all rows are done → clicks **Submit**
   ```
   POST /dataset-merged-rows/CLONE_A/submit
   →  { success: true, status: "SUBMITTED" }
   ```

---

### ADMIN — Export final annotated CSV

1. Go to dataset → click **Export**
   ```
   GET /datasets/DATASET_ID/export?format=csv
   →  downloads annotated CSV file
   ```

---

# 11. Workspace Management UI

## 11.1 Scope

Workspace Management adds the following frontend journey without replacing the existing dataset and annotation workflow:

```text
Workspace Templates
  -> Configure Healthcare Workspace
  -> Create Custom Workspace
  -> Workspace Dashboard
  -> Projects Listing
  -> Project Dashboard
  -> Dataset Dashboard
  -> Agentic Dataset Analytics
```

The eight Stitch-described screens are:

1. Workspace Templates
2. Configure Healthcare Workspace
3. Create Custom Workspace
4. Workspace Dashboard
5. Projects Listing
6. Project Dashboard
7. Dataset Dashboard
8. Agentic Dataset Analytics

The first delivery is frontend-first. This repository currently has dataset, annotation, consensus, statistics, user, and export APIs, but it does not have Workspace or Project backend resources. The initial UI therefore uses typed demo data behind repository adapters and uses real APIs wherever they already exist.

## 11.2 Workspace route structure

Use workspace-prefixed routes to avoid collisions with the existing dataset routes:

```text
/workspaces
/workspaces/new/template/[templateId]
/workspaces/new/custom
/workspaces/[workspaceId]
/workspaces/[workspaceId]/projects
/workspaces/[workspaceId]/projects/[projectId]
/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]
/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics
/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics/cases/[caseId]
```

The existing workflow remains available:

```text
/dataset
/dataset/add-dataset
/dataset/[datasetId]
/dataset/[datasetId]/annotation
/dataset/[datasetId]/consensus
/dataset/[datasetId]/statistics
```

## 11.3 Workspace Templates

Route:

```text
/workspaces
```

The page contains:

- All Industries, Healthcare, Financial Services, and Legal & Risk filter tabs.
- Healthcare template card.
- Banking template card.
- Custom Workspace card.
- Industry and sub-industry labels.
- Setup time estimate.
- Compliance badges.
- Use Template action.
- Start Manual Setup action.
- Selected-template detail panel.
- Module tab list.
- Pipeline Lifecycle list.
- Use Healthcare Template action.

Pipeline lifecycle:

```text
Upload -> OCR -> Classification -> Field Extraction -> Annotation -> Consensus -> Analytics -> Reports
```

Interactions:

- Selecting a filter updates visible cards.
- Selecting a card updates the detail panel.
- Use Template opens the selected configuration page.
- Start Manual Setup opens the custom builder.
- Template cards show skeletons while previews load.
- Cards become one column on mobile.
- The detail panel moves below the card grid on mobile.

## 11.4 Configure Healthcare Workspace

Route:

```text
/workspaces/new/template/healthcare
```

The configuration page contains:

- Workspace Name.
- Description.
- Workspace Logo.
- Theme Color.
- Visibility.
- Supported Document Types.
- Enabled AI Modules.
- Workflow Stages.
- Live Workspace Preview.
- Save Draft.
- Back to Templates.
- Create Workspace.

Supported document types:

```text
PDF, DOCX, PPTX, CSV, ZIP, Images, JSON, TXT
```

Healthcare AI modules:

```text
OCR Engine
LLM Extraction
NER
PII Redaction
```

Create Workspace is disabled until the Workspace Name is present and at least one document type is selected. Toggling a module updates the live preview immediately.

The live preview displays mock KPI tiles, navigation mapping, a trend chart, and a Healthcare Copilot preview. Values that are not supplied by the backend must be labeled `Demo data` or `Not available`.

## 11.5 Create Custom Workspace

Route:

```text
/workspaces/new/custom
```

The builder contains:

- Workspace Name and Description.
- Collapsible Organization section.
- Collapsible Security section.
- Collapsible AI Defaults section.
- Searchable Module Marketplace.
- All Modules, Intelligence, Annotation, and Automation filters.
- Add and Remove module actions.
- Live document preview.
- Accuracy and speed preview statistics.
- Orchestration Flow diagram.

Example marketplace modules:

```text
Neural OCR
Table Detection
LLM Extraction
RAG Engine
Human-in-Loop
NER Tagger
PII Redaction
Document Classifier
```

The Orchestration Flow updates when modules change:

```text
Upload -> Ingest -> Intelligence Hub -> OCR / LLM / NER -> Expert Review -> Consensus
```

Create Workspace requires at least one Document Intelligence module. If a search has no result, display:

```text
No modules match your search
Try another keyword or clear the category filter.
```

## 11.6 Workspace Dashboard

Route:

```text
/workspaces/[workspaceId]
```

The Workspace Dashboard displays:

- Workspace name and Active Cluster status.
- HIPAA, SOC2, ISO27001, and GDPR badges.
- Edit, Settings, and Export actions.
- Active Projects.
- Datasets.
- Documents Processed.
- AI Accuracy.
- Consensus Pending.
- Failed Documents.
- Document Intelligence Pipeline.
- Deep Intelligence Search.
- Recent Ingested Files.
- Active Workspace Projects.
- Workspace Health.
- Configuration Summary.
- Live Audit Stream.

The pipeline is:

```text
Upload -> OCR -> Classification -> Extraction -> Validation
```

Deep Intelligence Search suggestions include:

- Which documents failed OCR?
- What fields have the most conflicts?
- Show pending reviews.
- Which project has the lowest completion rate?

Clicking an active project row opens the Project Dashboard. Clicking the failed-document count opens the filtered document repository.

## 11.7 Projects Listing

Route:

```text
/workspaces/[workspaceId]/projects
```

The toolbar contains:

- Global search.
- Create Project.
- Import Project.
- Grid/list view toggle.
- Filter.
- Sort.

Each project card contains:

- Project code and name.
- Active, Paused, or Completed status.
- Domain tags.
- Dataset count.
- Member count.
- Progress bar.
- Avatar stack.
- Updated timestamp.

The right column contains Platform Summary, System Throughput, and Recent Activity. Search, filters, sorting, and grid/list mode are frontend state initially. The view mode may be persisted in local storage.

## 11.8 Project Dashboard

Route:

```text
/workspaces/[workspaceId]/projects/[projectId]
```

The Project Dashboard contains:

- Breadcrumb and System Status.
- Total Datasets.
- Medical Records.
- Documents Processed.
- AI Accuracy.
- OCR Accuracy.
- Review Queue.
- Annotation Progress Breakdown.
- AI Processing Pipeline.
- Dataset Overview cards.
- Medical AI Assistant.
- Quick Actions.
- System Health.

Annotation progress uses:

```text
Completed | In Review | Consensus | Pending | Returned
```

The segments must always sum to the project's total document count. The processing pipeline is:

```text
Upload -> Enhancement -> OCR -> Extraction -> Classification -> Validation
```

## 11.9 Dataset Dashboard

Route:

```text
/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]
```

The Dataset Dashboard contains:

- Dataset name, Active status, owner, created date, and document count.
- Upload Documents.
- Analytics.
- Export.
- Settings.
- Total Docs.
- Annotated.
- Pending Review.
- Completed.
- Failed.
- Batch Processing Pipeline.
- Document Repository.
- Operational Search.
- Saved Queries.
- Quick Actions.
- Dataset Information.

The batch pipeline is:

```text
Upload -> Image Processing -> OCR Stage -> Validation -> Annotation
```

The Document Repository supports:

- Filename, type, status, assigned annotator, and updated time.
- Search, filter, sort, and refresh.
- Row selection and select-all.
- Assign Annotator.
- Export Data.
- Delete with confirmation.

The new Workspace UI links to existing backend-aware routes where appropriate:

```text
/dataset/[datasetId]?tab=upload
/dataset/[datasetId]?tab=field-configuration
/dataset/[datasetId]/annotation
/dataset/[datasetId]/consensus
/dataset/[datasetId]/statistics
```

## 11.10 Agentic Dataset Analytics

Route:

```text
/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics
```

This is the case-level analytics and AI-assisted review screen. It contains:

- Workspace, project, and dataset breadcrumbs.
- Current case identifier.
- Previous Case and Next Case.
- Overall AI confidence.
- Save Draft.
- Export PDF.
- Submit Review.
- Dataset completion summary.
- Consensus agreement summary.
- Review queue summary.
- Average AI confidence summary.
- Most-conflicting-field summary.
- Healthcare View.
- Raw Fields.
- Original Document.
- Structured document details.
- Identification, vitals, status, history, and references.
- Annotation Intelligence panel.
- AI Suggested Answer.
- AI reasoning and confidence.
- Accept Suggestion.
- Reject.
- Review questions.
- Reviewer agreement check.
- Differences between reviewers.

Accept and Reject only change the reviewer's local answer. Neither action directly edits the source record. Submit Review is disabled until all required questions are answered.

The AI panel can search, summarize, explain, and suggest. It cannot submit, delete, resolve consensus, or directly overwrite annotation data.

---

# 12. Workspace Upload Integration

## 12.1 Existing upload flow

The current application is already integrated with CSV upload and annotation processing APIs.

Relevant modules:

```text
src/components/upload-components/csv-upload-component.tsx
src/components/upload-components/dataset-upload-component.tsx
src/lib/api/csv-imports.ts
src/lib/api/dataset-merged-rows.ts
src/lib/api/datasets.ts
```

Current working flow:

```text
Create Dataset
  -> Select CSV
  -> Preview CSV
  -> Validate headers and rows
  -> Upload CSV
  -> Add rows to Dataset
  -> Configure fields
  -> Annotate
  -> Consensus
  -> Export
```

The new Workspace UI must reuse this flow rather than creating a second CSV implementation.

## 12.2 Workspace upload interface

The Dataset Dashboard upload control should include:

- Drag-and-drop zone.
- Browse Files action.
- Supported type display.
- File extension and MIME validation.
- File size validation.
- Duplicate filename validation.
- Upload queue.
- Per-file progress.
- Processing stage.
- Retry failed file.
- Remove queued file.
- Final validation summary.
- Batch success state.
- Batch rejection state.

Supported UI types:

```text
PDF, DOCX, PPTX, CSV, ZIP, JPG, PNG, JSON, TXT
```

The queue should show statuses such as:

```text
Queued
Validating
Uploading
Processing
Ready
Failed
Rejected
```

If the product rule is all-or-nothing validation, a failed item must reject the batch with itemized reasons. The UI must not silently upload only part of a batch.

## 12.3 Current backend limitation

The current backend is CSV-first. CSV uploads can use the real existing APIs. PDF, DOCX, PPTX, image, JSON, and ZIP processing should use a clearly labeled frontend demo adapter until multi-format backend endpoints exist.

Real existing integrations:

```text
CSVImportsAPI.getByDataset
DatasetMergedRowsAPI.getAnnotationProgress
DatasetMergedRowsAPI.getDatasetRows
datasetsAPI.getById
```

Do not display a successful server upload when only local demo state changed.

## 12.4 Future multi-format contract

The backend should eventually expose a contract similar to:

```text
POST /workspaces/:workspaceId/datasets/:datasetId/documents
GET  /workspaces/:workspaceId/datasets/:datasetId/documents
GET  /workspaces/:workspaceId/datasets/:datasetId/upload-jobs/:jobId
POST /workspaces/:workspaceId/datasets/:datasetId/upload-jobs/:jobId/retry
DELETE /workspaces/:workspaceId/datasets/:datasetId/documents/:documentId
```

The final contract must define:

- Accepted MIME types.
- Maximum file size.
- Maximum batch size.
- Validation response.
- Upload job ID.
- Processing status.
- Per-file error codes.
- Retry behavior.
- Cancellation behavior.
- Mapping from uploaded files to repository records.

## 12.5 Fintech upload branch

Fintech or Banking compliance upload is a separate branch after Workspace Management:

```text
feature/workspace-management
  -> feature/fintech-document-compliance
```

The Fintech branch adds:

- Invoice PDF upload.
- Scanned image upload.
- DOCX upload.
- XLSX upload.
- Vendor mapping.
- Invoice number mapping.
- Amount mapping.
- Date mapping.
- Tax ID mapping.
- Compliance validation.

Fintech flow:

```text
Upload Invoices or Statements
  -> Validate Batch
  -> OCR
  -> Quality Check
  -> Field Mapping Wizard
  -> Preview
  -> Submit to Workspace Pipeline
```

---

# 13. Analytics Definition

## 13.1 Answer for the review discussion

The Analytics view is not only a chart page. It combines dataset operational analytics with case-level AI-assisted review.

Dataset-level analytics explain:

- Document volume.
- Processing progress.
- Annotation completion.
- Pending review workload.
- Failed documents.
- Consensus agreement.
- Consensus conflicts.
- Field-level conflicts.
- Annotator completion.
- Pipeline health.

Case-level analytics explain:

- Extracted values for the selected case.
- AI suggested answer.
- AI confidence.
- AI reasoning.
- Reviewer answers.
- Differences between reviewers.
- Required questions remaining before submission.

## 13.2 Metric definitions

| Metric | Definition |
|--------|------------|
| Total Documents | Number of uploaded documents or dataset rows |
| Processed Documents | Documents that completed processing |
| Annotated Documents | Documents with completed annotation |
| Pending Review | Documents waiting for human or consensus review |
| Failed Documents | Documents that failed validation or processing |
| Annotation Completion | Annotated documents divided by total documents |
| Consensus Agreement | Agreed rows divided by total consensus rows |
| Consensus Conflict | Rows where reviewers supplied different values |
| Resolution Rate | Resolved conflicts divided by total conflicts |
| AI Confidence | Model confidence for the selected suggestion |
| OCR Accuracy | OCR quality score when supplied by the backend |
| Average Processing Time | Average upload-to-completion duration |
| Review Queue | Cases requiring human review |
| Field Conflict Rate | Conflicting values for a field divided by reviewed values |
| Annotator Completion | Completed assignments divided by assigned assignments |
| Pipeline Health | Status of each processing stage |

## 13.3 Data availability

The current backend can provide real values for datasets, CSV imports, total rows, annotation progress, consensus reviews, consensus statistics, annotator assignments, users, and exports.

The current backend does not provide real Workspace records, Project records, OCR pipeline history, AI accuracy, OCR accuracy, AI Copilot responses, or case-level AI suggestions.

Until those APIs exist, display `Demo data`, `Not available`, or omit the metric. Do not present fabricated values as production analytics.

---

# 14. Workspace Routes

| Route | Screen | Initial data source |
|-------|--------|---------------------|
| `/workspaces` | Workspace Templates | Demo repository |
| `/workspaces/new/template/[templateId]` | Template Configuration | Demo repository and form state |
| `/workspaces/new/custom` | Custom Workspace Builder | Demo repository and form state |
| `/workspaces/[workspaceId]` | Workspace Dashboard | Demo repository plus existing APIs where mapped |
| `/workspaces/[workspaceId]/projects` | Projects Listing | Demo repository |
| `/workspaces/[workspaceId]/projects/[projectId]` | Project Dashboard | Demo repository |
| `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]` | Dataset Dashboard | Existing dataset APIs plus adapter |
| `/workspaces/[workspaceId]/projects/[projectId]/datasets/[datasetId]/analytics` | Agentic Dataset Analytics | Demo analytics plus existing consensus data |
| `/dataset/[datasetId]/statistics` | Consensus Statistics | Existing `consensusAPI` |

---

# 15. Implementation Phases

## Phase 0: Branch and baseline

- Review the dirty worktree.
- Preserve current annotation and consensus changes.
- Confirm the target branch.
- Record baseline build and TypeScript status.

## Phase 1: Workspace foundation

- Add Workspace types.
- Add demo repository and storage.
- Add Workspace layout.
- Add breadcrumbs and navigation.
- Add reusable KPI, status, pipeline, health, and activity components.

## Phase 2: Workspace creation

- Build Workspace Templates.
- Build Healthcare Configuration.
- Build Custom Workspace Builder.
- Add validation, marketplace filtering, live preview, and persistence.

## Phase 3: Dashboards

- Build Workspace Dashboard.
- Build Projects Listing.
- Build Create Project and Import Project modals.
- Build Project Dashboard.
- Add search, filtering, sorting, and responsive states.

## Phase 4: Dataset Dashboard

- Build Dataset Dashboard.
- Add repository table and pipeline stepper.
- Add KPI cards, row selection, and bulk actions.
- Add upload queue.
- Connect existing dataset, CSV import, progress, and export APIs.

## Phase 5: Analytics

- Build analytics summary strip.
- Build selected case view.
- Build AI suggestion card.
- Build review questions and agreement differences.
- Build Accept, Reject, Save Draft, Previous, Next, and Submit Review behavior.
- Link detailed consensus statistics.

## Phase 6: Verification

- Run TypeScript validation.
- Run production build.
- Run existing consensus Playwright coverage.
- Add Workspace Playwright coverage.
- Verify desktop, tablet, and mobile states.
- Verify existing annotation and dataset workflows remain functional.

---

# 16. GitHub Push Commands

Use the command sequence that matches the branch decision. These commands are documentation only and are not executed automatically.

## Push the current branch

```bash
git status --short --branch
git diff -- tasks.md README.md
git add tasks.md README.md
git commit -m "docs: add workspace management frontend plan"
git push -u origin feature/annotation-ui-integration
```

## Create and push the PRD branch

```bash
git status --short --branch
git log --oneline --graph --decorate -12
git switch feature/nested-conditional-questions
git switch -c feature/workspace-management
git add tasks.md README.md
git commit -m "docs: add workspace management frontend plan"
git push -u origin feature/workspace-management
```

## Push later Workspace UI implementation commits

```bash
git status --short --branch
git diff --stat
git add src/app/workspaces src/components/workspace src/components/workspace-management src/components/project src/components/dataset-workspace src/components/analytics src/lib/api/workspace.ts src/lib/api/project.ts src/lib/api/analytics.ts src/lib/workspace tasks.md README.md
git commit -m "feat: add workspace management frontend"
git push
```

## Create the later Fintech branch

```bash
git switch feature/workspace-management
git pull --ff-only origin feature/workspace-management
git switch -c feature/fintech-document-compliance
git push -u origin feature/fintech-document-compliance
```

---

## 17. Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page at `localhost:3000` | Check `docker compose logs frontend` for build errors |
| API calls return `Network Error` | Verify `NEXT_PUBLIC_API_URL` is correct and backend is running |
| `CORS` error in browser console | Ensure backend `FRONTEND_URL=http://localhost:3000` in its `.env.docker` |
| Google login fails / redirect mismatch | Callback URL in `.env.docker` must match Google Cloud Console exactly |
| Changes not visible after code edit | Rebuild: `docker compose up --build -d` |
| Port 3000 already in use | `netstat -ano \| findstr :3000` → kill the process |
| `NEXT_PUBLIC_API_URL` is `undefined` | You must pass it as a **build arg**, not just a runtime env |
