#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-time GCP setup for GitHub Actions -> Cloud Run deploys (keyless / WIF).
#
# Run this ONCE, by someone with Owner (or equivalent) on the project:
#     ./scripts/gcp-setup.sh
#
# It is idempotent — safe to re-run. At the end it prints the two values you
# paste into GitHub repo secrets: GCP_WIF_PROVIDER and GCP_DEPLOYER_SA.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config (must match .github/workflows/deploy-development.yml) ──────────────
PROJECT_ID="refined-outlet-249712"
REGION="asia-south1"
AR_REPO="data-annotation"
GITHUB_REPO="latentsig/annotation-platform-frontend"   # owner/repo

SA_NAME="github-deployer"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"

# ── Derived ──────────────────────────────────────────────────────────────────
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Project: ${PROJECT_ID} (#${PROJECT_NUMBER})"
echo "Repo:    ${GITHUB_REPO}"
echo

# ── 1. Enable required APIs ──────────────────────────────────────────────────
echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  --project "${PROJECT_ID}"

# ── 2. Artifact Registry repo ────────────────────────────────────────────────
echo "==> Ensuring Artifact Registry repo '${AR_REPO}'..."
if ! gcloud artifacts repositories describe "${AR_REPO}" \
      --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location "${REGION}" \
    --project "${PROJECT_ID}" \
    --description "Data annotation platform images"
else
  echo "    already exists."
fi

# ── 3. Deployer service account ──────────────────────────────────────────────
echo "==> Ensuring service account '${SA_EMAIL}'..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" \
      --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --project "${PROJECT_ID}" \
    --display-name "GitHub Actions deployer"
else
  echo "    already exists."
fi

# A freshly-created SA takes a few seconds to propagate; IAM bindings against it
# fail with "does not exist" until then. Wait for it before granting roles.
echo "==> Waiting for service account to propagate..."
for i in $(seq 1 12); do
  if gcloud iam service-accounts describe "${SA_EMAIL}" \
       --project "${PROJECT_ID}" >/dev/null 2>&1; then
    echo "    ready."
    break
  fi
  sleep 5
done

# ── 4. Grant the deployer the roles it needs ─────────────────────────────────
echo "==> Granting IAM roles to deployer..."
for ROLE in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member "serviceAccount:${SA_EMAIL}" \
    --role "${ROLE}" \
    --condition=None >/dev/null
  echo "    + ${ROLE}"
done

# ── 5. Workload Identity Federation pool + provider ──────────────────────────
echo "==> Ensuring Workload Identity pool '${POOL_ID}'..."
if ! gcloud iam workload-identity-pools describe "${POOL_ID}" \
      --location=global --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --location=global --project "${PROJECT_ID}" \
    --display-name "GitHub Actions pool"
else
  echo "    already exists."
fi

echo "==> Ensuring OIDC provider '${PROVIDER_ID}'..."
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
      --location=global --workload-identity-pool="${POOL_ID}" \
      --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --location=global \
    --project "${PROJECT_ID}" \
    --workload-identity-pool="${POOL_ID}" \
    --display-name "GitHub OIDC" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com"
else
  echo "    already exists."
fi

# ── 6. Let the GitHub repo impersonate the deployer SA ───────────────────────
echo "==> Binding repo '${GITHUB_REPO}' -> SA impersonation..."
PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project "${PROJECT_ID}" \
  --role roles/iam.workloadIdentityUser \
  --member "${PRINCIPAL}" >/dev/null

# ── Done — print the GitHub secret values ────────────────────────────────────
PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

cat <<EOF

─────────────────────────────────────────────────────────────────────────────
✅ Setup complete. Add these two secrets to the GitHub repo
   (Settings → Secrets and variables → Actions → New repository secret):

   GCP_WIF_PROVIDER = ${PROVIDER_RESOURCE}
   GCP_DEPLOYER_SA  = ${SA_EMAIL}

Then push to 'feature/nested-conditional-questions' (or run the workflow
manually from the Actions tab) to deploy.
─────────────────────────────────────────────────────────────────────────────
EOF
