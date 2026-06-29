# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@11 && \
    apk add --no-cache openssl openssl-dev

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

RUN pnpm install --ignore-scripts && \
    pnpm approve-builds --all && \
    pnpm rebuild

# Generate Prisma client before compiling TypeScript
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

COPY backend ./backend
WORKDIR /app/backend
RUN pnpm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g pnpm@11 && \
    apk add --no-cache curl openssl openssl-dev

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma

# Install deps fresh (pnpm symlinks work correctly in a clean environment)
RUN pnpm install --ignore-scripts && \
    pnpm approve-builds --all && \
    pnpm rebuild

# Copy compiled application over the installed source
COPY --from=builder /app/backend/dist ./backend/dist

COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
