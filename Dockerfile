# -----------------------------------------------------------------------------
# Stage 1: Base image with Node 22 Alpine, libc6-compat, and Corepack pnpm
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# -----------------------------------------------------------------------------
# Stage 2: Install dependencies with BuildKit pnpm cache mount
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy root and package manifests to leverage Docker layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Build the Next.js standalone bundle
# -----------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm turbo run build --filter=@chokro/api

# -----------------------------------------------------------------------------
# Stage 4: Minimal production runner with non-root user
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create dedicated non-root system user and group
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy static assets, public files, and standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/public ./apps/api/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/static ./apps/api/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/api/server.js"]
