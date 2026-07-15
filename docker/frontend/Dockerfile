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

# ─── Stage 1b: Production-only dependencies ──────────────────────────────────
# Install aparte con --prod --filter frontend: el runner no necesita
# eslint/typescript/vite/vitest que "deps" instala para compilar y testear.
# Sin --filter, --prod solo no alcanza — pnpm igual resuelve devDependencies
# de backend (jest/ts-jest/@nestjs/cli) porque el lockfile es del workspace
# completo y backend/package.json no está copiado en esta imagen. La mayoría
# de los hallazgos CRITICAL/HIGH de Trivy venían de ahí, no de dependencias
# que corren en runtime.
FROM node:22-alpine AS prod-deps

RUN npm install -g pnpm@11

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

RUN pnpm install --prod --filter frontend --ignore-scripts && \
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

# Copy node_modules from prod-deps stage (solo dependencies, sin devDependencies)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/frontend/node_modules ./frontend/node_modules

# Copy built Next.js output, public assets and config (next start lee
# next.config.js en runtime para settings como poweredByHeader, no solo
# en build time)
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.js ./frontend/next.config.js

WORKDIR /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

USER node

CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
