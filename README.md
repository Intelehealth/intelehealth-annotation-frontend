# Dyno Annotation Platform — Frontend

> **Next.js 15** | Node 26-alpine | Port **3000 / 3001**

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
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Docker Desktop | ≥ 4.x | `docker --version` |
| Docker Compose v2 | bundled | `docker compose version` |
| Backend running | — | `curl http://localhost:5000/` |

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
$env:NEXT_PUBLIC_API_URL = "http://localhost:5000"
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
# .env.local already exists with: NEXT_PUBLIC_API_URL=http://localhost:5000

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
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### For Docker

Passed as a build arg in `docker-compose.yml`:

```yaml
build:
  args:
    - NEXT_PUBLIC_API_URL=http://localhost:5000
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
   → GET http://localhost:5000/auth/google
   → Redirected to Google OAuth
   → Google redirects to http://localhost:5000/auth/google/callback
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

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page at `localhost:3000` | Check `docker compose logs frontend` for build errors |
| API calls return `Network Error` | Verify `NEXT_PUBLIC_API_URL` is correct and backend is running |
| `CORS` error in browser console | Ensure backend `FRONTEND_URL=http://localhost:3000` in its `.env.docker` |
| Google login fails / redirect mismatch | Callback URL in `.env.docker` must match Google Cloud Console exactly |
| Changes not visible after code edit | Rebuild: `docker compose up --build -d` |
| Port 3000 already in use | `netstat -ano \| findstr :3000` → kill the process |
| `NEXT_PUBLIC_API_URL` is `undefined` | You must pass it as a **build arg**, not just a runtime env |
