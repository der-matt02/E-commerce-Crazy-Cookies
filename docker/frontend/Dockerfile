# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN npm install -g pnpm@11

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

# Install without build scripts, approve all, then rebuild native modules
RUN pnpm install --ignore-scripts && \
    pnpm approve-builds --all && \
    pnpm rebuild

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@11

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-workspace.yaml ./

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

COPY frontend ./frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/frontend
RUN pnpm run build

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g pnpm@11 && \
    apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

# Copy node_modules from deps stage (includes native builds)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Copy built Next.js output and public assets
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public

WORKDIR /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
