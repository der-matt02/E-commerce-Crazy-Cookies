#!/bin/bash
set -e

pnpm --filter backend install --no-frozen-lockfile
pnpm --filter backend exec prisma generate
echo "Prisma client generado correctamente"
