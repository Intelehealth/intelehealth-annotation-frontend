# ─── Stage 1: Install & build ─────────────────────────────────────────────────
FROM docker.io/library/node:26-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy manifests first (layer cache)
COPY package.json package-lock.json* ./

# npm install avoids SIGBUS on WSL2/NTFS mounts (npm ci uses mmap which crashes)
RUN npm install --frozen-lockfile --prefer-offline

# Copy ALL source into the Docker layer (now on container's ext4 fs, not NTFS)
COPY . .

# Build-time env var — baked into the JS bundle at compile time
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Cap Node heap to prevent OOM/SIGBUS during webpack compilation in WSL2
# Next.js webpack needs ~1.5-2 GB — without cap, WSL2 exhausts RAM → SIGBUS
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npm run build

# ─── Stage 2: Lean production runner ──────────────────────────────────────────
FROM docker.io/library/node:26-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Clear build-time heap cap — production runs with Node defaults
ENV NODE_OPTIONS=""

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone output
# IMPORTANT: standalone/node_modules must be copied — it contains @swc/helpers
# which is a Next.js runtime dependency. Excluding it causes MODULE_NOT_FOUND.
COPY --from=builder --chown=nextjs:nodejs /app/public                      ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone            .
COPY --from=builder --chown=nextjs:nodejs /app/.next/static                ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
