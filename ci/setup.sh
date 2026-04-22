#!/bin/bash
set -e

which pnpm || npm install -g pnpm@8
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
rm -rf node_modules 2>/dev/null || true
pnpm --filter backend install --frozen-lockfile=false
pnpm --filter backend exec prisma generate
echo "Prisma client generado correctamente"
