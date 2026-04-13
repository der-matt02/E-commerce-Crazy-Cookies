#!/bin/sh
set -e

# Add workspace node_modules to PATH so prisma CLI is reachable
export PATH="/app/node_modules/.bin:/app/backend/node_modules/.bin:$PATH"

echo "==> Running Prisma migrations..."
cd /app/backend
prisma migrate deploy

echo "==> Starting Crazy Cookies Backend..."
exec node dist/main
