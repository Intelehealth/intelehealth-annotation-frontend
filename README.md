# Dyno Annotation Platform — Frontend

A production-grade data annotation platform built with **Next.js 15.4.7**, **React 19.1.0**, **TypeScript**, and **Tailwind CSS v4**. This frontend communicates with the NestJS backend API and requires both the backend and MongoDB to be running.

| Component       | URL / Port                    |
| --------------- | ----------------------------- |
| Frontend (this) | `http://localhost:3000`       |
| Backend API     | `http://localhost:4000`       |
| MongoDB         | `mongodb://localhost:27017`   |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Environment Variables](#3-environment-variables)
4. [Running the Application](#4-running-the-application)
5. [Build for Production](#5-build-for-production)
6. [Code Quality](#6-code-quality)
7. [Routes](#7-routes)
8. [Upload Workflow](#8-upload-workflow)
9. [Supported Upload Formats](#9-supported-upload-formats)
10. [Annotation Workflow](#10-annotation-workflow)
11. [Analytics](#11-analytics)
12. [Troubleshooting](#12-troubleshooting)
13. [All OS Setup Guide](#13-all-os-setup-guide)

---

## 1. Prerequisites

| Tool       | Minimum Version | Check Command          |
| ---------- | --------------- | ---------------------- |
| Node.js    | 22+             | `node --version`       |
| npm        | 10+             | `npm --version`        |
| MongoDB    | 6+              | `mongod --version`     |
| Backend    | —               | `curl localhost:4000`  |

> The backend repository must be cloned, configured, and running before starting the frontend. See the backend README for instructions.

---

## 2. Installation

```bash
git clone <repository-url>
cd annotation-platform-frontend

npm install
```

---

## 3. Environment Variables

Copy the example environment file:

```bash
# Windows CMD:     copy .env.local.example .env.local
# PowerShell:      Copy-Item .env.local.example .env.local
# macOS / Linux / WSL / Git Bash:
cp .env.local.example .env.local
```

The only frontend environment variable is:

| Variable              | Required Value                  | Description                        |
| --------------------- | ------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000`         | Base URL of the NestJS backend API |

> `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at build time. If you change this value, you must rebuild.

---

## 4. Running the Application

### Development (hot reload)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production (after build)

```bash
npm start
```

### Required running services

All three must be active simultaneously:

| Service  | How to start                                                |
| -------- | ----------------------------------------------------------- |
| MongoDB  | `mongod` or `mongosh` or via Docker                         |
| Backend  | `cd backend && npm run start:dev` (see backend README)      |
| Frontend | `npm run dev` (this repository)                             |

---

## 5. Build for Production

```bash
npm run build
```

The output uses Next.js `standalone` mode (configured in `next.config.ts`). The build artifact is written to `.next/` (production) or `.next-dev/` (development).

> **Note:** `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` are configured. TypeScript and ESLint errors are suppressed during production builds. Run `npx tsc --noEmit` separately to check types.

---

## 6. Code Quality

```bash
# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 7. Routes

| Route                                 | Page                            | Access         |
| ------------------------------------- | ------------------------------- | -------------- |
| `/login`                              | Login (email / Google OAuth)    | Public         |
| `/dashboard`                          | Role-based dashboard            | ADMIN/ANNOTATOR |
| `/dataset`                            | Dataset list                    | ADMIN          |
| `/dataset/[id]`                       | Dataset detail + field config   | ADMIN          |
| `/dataset/[id]/annotation`            | Annotation workbench (3 modes)  | ADMIN/ANNOTATOR |
| `/dataset/[id]/analytics`             | Redirects to annotation?view=dataset-analytics | ADMIN |
| `/dataset/[id]/consensus`             | Consensus review                | ADMIN          |
| `/tasks`                              | My assigned tasks               | ANNOTATOR      |
| `/users`                              | User management (invite, roles) | ADMIN          |
| `/profile`                            | Profile + change password       | All            |

---

## 8. Upload Workflow

**Admin upload flow:**

1. Navigate to **Datasets** → **Add Dataset**
2. Enter a name and description → **Create**
3. On the dataset detail page, click **Upload CSV** or choose a document type
4. Select a file → **Upload**
5. The backend processes the file and adds rows to the dataset
6. Configure annotation fields (text, dropdown, number, etc.) → **Save Field Configuration**

---

## 9. Supported Upload Formats

The platform supports **18 file formats** for upload and processing:

| Category | Formats |
|---|---|
| Tabular Data | CSV, XLS, XLSX |
| Documents | PDF, DOCX, DOC, ODT |
| Presentations | PPTX, PPT, ODP |
| Images | PNG, JPG, JPEG, TIFF, BMP, WEBP, SVG |
| Archives | ZIP (nested extraction up to depth 2) |

**Important notes:**
- **CSV uploads** create datasets with embedded row storage. Very large CSVs (>100k rows) may hit MongoDB's 16 MB BSON document limit.
- **PDF uploads** work for native-text PDFs. For scanned/image-only PDFs, text extraction will return empty results because the backend OCR provider is a stub (no true OCR is configured).
- **ZIP archives** can contain any of the above formats. Maximum 500 files, 500 MB total extracted size, nesting depth 2.
- **Cloud sources** (Google Drive, OneDrive, Dropbox, S3, Azure Blob, SharePoint) require manual environment variable configuration in the backend.

---

## 10. Annotation Workflow

**Admin — Prepare dataset:**

1. Create dataset and upload data (see [Upload Workflow](#8-upload-workflow))
2. Configure annotation fields on the dataset detail page
3. Clone the dataset to one or more annotators → **Clone & Assign**

**Annotator — Annotate data:**

1. Log in and go to **My Tasks**
2. Click on an assigned task to open the **Annotation Workbench**
3. Review each row and fill in annotation fields
4. Save progress incrementally
5. When all rows are complete, click **Submit**

**Admin — Review and export:**

1. Review annotations via the **Consensus** page at `/dataset/[id]/consensus`
2. Export annotated data as CSV from the dataset detail page

### Workbench Modes

The annotation workbench supports three view modes accessible from the top navigation bar:

| Mode | Button | Description |
|------|--------|-------------|
| **Annotation** | `[ Annotation ]` | Two-panel layout: left = data/document view, right = annotation fields |
| **Document View** | `[ Document View ]` | Full source document preview for the selected row |
| **Dataset Analytics** | `[ Dataset Analytics ]` | Inline analytics dashboard (same page, not a separate route) |

All three modes stay within the same workbench page. Switching modes preserves the selected dataset and row context. The existing "Back to Dataset" button returns to the dataset detail page.

**Document View** renders inline previews based on file type:

| Format | Preview Mode | Details |
|--------|-------------|---------|
| **PDF** | Embedded iframe | Native browser PDF viewer with page navigation, zoom |
| **PNG, JPG, JPEG, TIFF, BMP, WEBP** | Inline `<img>` | Scaled to fit, preserves aspect ratio |
| **SVG** | Inline `<img>` | Rendered safely (no script execution) |
| **CSV** | Paginated HTML table | Header row + data rows, 25 rows per page, pagination controls |
| **XLSX / XLS** | Paginated HTML table | Sheet selector dropdown, header row, pagination, parsed via exceljs |
| **DOCX, DOC, PPTX, PPT, ODT, ODP** | Download link | Browser-native preview not available; file can be downloaded |
| **ZIP** | Download link | Not rendered inline; extracted documents are individual assets |

Documents are served through the backend's protected content endpoint with JWT authentication.

---

## 11. Analytics

Analytics are available inline within the dataset workbench by selecting "Dataset Analytics" mode from the navigation. The standalone `/dataset/[id]/analytics` route redirects to the workbench with `?view=dataset-analytics`. Data is fetched from the backend analytics API:

- **Dataset-level metrics:** total documents, row count, annotation progress, consensus status
- **Processing metrics:** document status distribution (pie chart), source type breakdown
- **Annotation progress:** completion percentage, completed/in-progress/pending breakdown (bar chart)
- **Consensus overview:** agreed/disagreed/resolved/pending counts, agreement rate gauge
- **AI Analytics Agent:** read-only query tool for dataset summary, failures, low-confidence fields, pending reviews, duplicates, etc.

All analytics are read-only — they never modify data. Visualizations use **Recharts** (pie charts, bar charts, progress bars, gauge charts).

---

## 12. Troubleshooting

| Problem                              | Likely Cause                         | Fix                                                                                                              |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Blank page at `localhost:3000`       | Build or runtime error               | Check terminal output. Run `npm run build` to see errors.                                                        |
| API calls return `Network Error`     | Backend not running / wrong API URL  | Verify `curl http://localhost:4000` returns a response. Check `NEXT_PUBLIC_API_URL` in `.env.local`.              |
| `CORS` error in browser console      | Backend `FRONTEND_URL` mismatch      | Ensure backend `.env` has `FRONTEND_URL=http://localhost:3000`.                                                   |
| Google login redirects wrong         | Callback URL mismatch                | Backend `GOOGLE_CALLBACK_URL` must match Google Cloud Console exactly.                                           |
| Port 3000 already in use             | Another process on that port         | **CMD:** `netstat -ano \| findstr :3000` / **PowerShell:** `netstat -ano \| Select-String :3000` / **WSL/Linux/Mac:** `lsof -i :3000` |
| MongoDB connection error             | MongoDB not running                  | Start `mongod` or check MongoDB connection string in backend `.env`.                                             |
| `NEXT_PUBLIC_API_URL` is `undefined` | Missing env variable at build time   | Ensure `.env.local` exists and contains the variable. Rebuild if needed.                                         |
| Uploaded file rejected               | Format not supported or corrupt      | Check the 18 supported formats. Files are validated by magic bytes on the backend.                               |
| PDF text appears empty               | Scanned PDF without text layer       | The backend OCR provider is a stub. Only native-text PDFs are supported.                                         |
| Processed data not appearing         | Backend processing incomplete        | Check SSE event stream at `/processing/document/:id/events` on the backend.                                      |

---

## 13. All OS Setup Guide

### Identifying your environment

| Environment         | How to identify                              |
| ------------------- | -------------------------------------------- |
| Windows CMD         | `echo %OS%` → `Windows_NT`                   |
| Windows PowerShell  | `$PSVersionTable.PSVersion`                  |
| Windows WSL (Ubuntu)| `uname -r` → contains `microsoft`            |
| Windows Git Bash    | `echo $MSYSTEM` → `MINGW64` or `MSYS`        |
| macOS               | `uname -s` → `Darwin`                        |
| Linux               | `uname -s` → `Linux`                         |

### Command equivalents

| Operation            | CMD                             | PowerShell                            | WSL / macOS / Linux / Git Bash         |
| -------------------- | ------------------------------- | ------------------------------------- | -------------------------------------- |
| Copy file            | `copy src dest`                 | `Copy-Item src dest`                  | `cp src dest`                          |
| Navigate to folder   | `cd path\to\folder`             | `cd path\to\folder`                   | `cd path/to/folder`                    |
| List files           | `dir`                           | `ls` / `Get-ChildItem`                | `ls`                                   |
| Environment variable | `set VAR=value`                 | `$env:VAR = "value"`                  | `export VAR=value`                     |
| Check port usage     | `netstat -ano \| findstr :PORT` | `netstat -ano \| Select-String :PORT` | `lsof -i :PORT` / `ss -tlnp \| grep :PORT` |

### Full setup by OS

<details>
<summary><strong>Windows (CMD)</strong></summary>

```cmd
REM 1. Install Node.js 22+ from https://nodejs.org
node --version

REM 2. Clone and install
git clone <repository-url>
cd annotation-platform-frontend
npm install

REM 3. Create env file
copy .env.local.example .env.local

REM 4. Start MongoDB (using Docker Desktop)
docker run -d -p 27017:27017 --name mongodb mongo:7

REM 5. Start the backend (in a separate terminal)
cd ../backend
copy .env.example .env
npm install
npm run start:dev

REM 6. Start the frontend (in another terminal)
cd ../annotation-platform-frontend
npm run dev

REM 7. Open http://localhost:3000
```
</details>

<details>
<summary><strong>Windows (PowerShell)</strong></summary>

```powershell
# 1. Install Node.js 22+ from https://nodejs.org
node --version

# 2. Clone and install
git clone <repository-url>
cd annotation-platform-frontend
npm install

# 3. Create env file
Copy-Item .env.local.example .env.local

# 4. Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7

# 5. Start the backend (separate terminal)
cd ../backend
Copy-Item .env.example .env
npm install
npm run start:dev

# 6. Start the frontend (separate terminal)
cd ../annotation-platform-frontend
npm run dev

# 7. Open http://localhost:3000
```
</details>

<details>
<summary><strong>Windows (WSL / Ubuntu)</strong></summary>

```bash
# 1. Install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version

# 2. Clone and install
git clone <repository-url>
cd annotation-platform-frontend
npm install

# 3. Create env file
cp .env.local.example .env.local

# 4. Start MongoDB
sudo mongod --dbpath /var/lib/mongodb &
# or via Docker: docker run -d -p 27017:27017 --name mongodb mongo:7

# 5. Start the backend (separate terminal)
cd ../backend
cp .env.example .env
npm install
npm run start:dev

# 6. Start the frontend (separate terminal)
cd ../annotation-platform-frontend
npm run dev

# 7. Open http://localhost:3000
```
</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
# 1. Install Node.js 22+ via Homebrew
brew install node@22
node --version

# 2. Clone and install
git clone <repository-url>
cd annotation-platform-frontend
npm install

# 3. Create env file
cp .env.local.example .env.local

# 4. Start MongoDB
brew services start mongodb-community@7
# or via Docker: docker run -d -p 27017:27017 --name mongodb mongo:7

# 5. Start the backend (separate terminal)
cd ../backend
cp .env.example .env
npm install
npm run start:dev

# 6. Start the frontend (separate terminal)
cd ../annotation-platform-frontend
npm run dev

# 7. Open http://localhost:3000
```
</details>

<details>
<summary><strong>Linux (Ubuntu / Debian)</strong></summary>

```bash
# 1. Install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version

# 2. Clone and install
git clone <repository-url>
cd annotation-platform-frontend
npm install

# 3. Create env file
cp .env.local.example .env.local

# 4. Start MongoDB
sudo systemctl start mongod
# or: docker run -d -p 27017:27017 --name mongodb mongo:7

# 5. Start the backend (separate terminal)
cd ../backend
cp .env.example .env
npm install
npm run start:dev

# 6. Start the frontend (separate terminal)
cd ../annotation-platform-frontend
npm run dev

# 7. Open http://localhost:3000
```
</details>

---

## Project Structure

```
src/
├── app/          # Next.js App Router pages and layouts
├── components/   # Reusable UI components (shadcn/ui, Radix)
├── contexts/     # React context providers
├── lib/          # API clients, utilities, helpers
├── schemas/      # Zod validation schemas
├── types/        # TypeScript type definitions
└── middleware.ts # Next.js middleware (auth, route protection)
```

## Tech Stack

| Technology      | Version / Notes                    |
| --------------- | ---------------------------------- |
| Next.js         | 15.4.7 (App Router, standalone output) |
| React           | 19.1.0                             |
| TypeScript      | 5.x                                |
| Tailwind CSS    | 4 (via @tailwindcss/postcss)       |
| shadcn/ui       | Radix UI primitives + CVA          |
| Axios           | HTTP client for API calls          |
| React Hook Form | Form management + Zod validation   |
| Framer Motion   | Animations                         |
| Recharts        | Analytics charts                   |
| Playwright      | E2E testing                        |

## License

Proprietary — Dyno Annotation Platform
# Document upload + async processing (frontend)

## Run
```
cd annotation-platform-frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                        # http://localhost:3000
```
Production: `npm run build && npm run start`.

Backend + worker must be running (see backend README). The frontend calls the
backend directly at `NEXT_PUBLIC_API_URL`; only `NEXT_PUBLIC_*` variables are
exposed to the browser (never secrets).

## Upload → processing → Field Config
1. Upload returns HTTP 202 → item shows **Queued**, then **Processing**, then **Completed**.
2. The Upload tab shows a truthful **Worker connected / Worker unavailable** banner
   (from `GET /processing/worker/status`).
3. When the first document completes and no field config exists, the app auto-opens
   `?tab=field-configuration` (driven by API state, not a timer).
4. Workbench header = **Back to Dataset** + [Annotation][Document View][Dataset Analytics].
   Dataset Analytics renders inside the same workbench and shows real metrics.

## Error handling
- "Upload timed out" only on a real network timeout.
- HTTP errors map to clear messages (400/401/403/413/422/500/503).
- The auth-refresh call has a 10s timeout so it can't hold an upload hostage.

## Supported formats (frontend dropzone)
PDF, PNG, JPG, JPEG, TIFF, BMP, WEBP, SVG, CSV, XLS, XLSX, DOC, DOCX, PPT, PPTX,
ODT, ODP, ZIP. Legacy DOC/PPT are reported BLOCKED at processing (no converter).
