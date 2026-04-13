# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

RUN npm install -g pnpm@8

WORKDIR /app

# Copy workspace manifests first (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# Install all deps (including dev, needed to compile)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY backend ./backend
WORKDIR /app/backend
RUN pnpm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:18-alpine AS runner

RUN npm install -g pnpm@8 && \
    apk add --no-cache curl

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# Copy Prisma schema BEFORE installing so @prisma/client postinstall can generate
COPY --from=builder /app/backend/prisma ./backend/prisma

# Install production deps only (postinstall generates Prisma client from schema)
RUN pnpm install --prod --frozen-lockfile

# Copy compiled application
COPY --from=builder /app/backend/dist ./backend/dist

# Copy entrypoint script
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
