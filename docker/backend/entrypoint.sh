#!/bin/sh
set -e

export PATH="/app/node_modules/.bin:/app/backend/node_modules/.bin:$PATH"

cd /app/backend

echo "==> Running Prisma migrations..."
prisma migrate deploy

echo "==> Starting Crazy Cookies Backend..."
exec node dist/main
