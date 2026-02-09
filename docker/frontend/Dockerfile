# Stage 1: Dependencies
FROM node:18-alpine AS deps

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Copy source code
COPY frontend ./frontend

# Build the application
WORKDIR /app/frontend
RUN pnpm run build

# Stage 3: Production
FROM node:18-alpine AS runner

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

ENV NODE_ENV production

# Copy package files
COPY --from=builder /app/frontend/package.json ./
COPY --from=builder /app/frontend/next.config.js ./
COPY --from=builder /app/frontend/public ./public

# Copy built application
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
