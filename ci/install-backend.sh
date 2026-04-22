#!/bin/bash
set -e

rm -rf node_modules/.pnpm/node_modules 2>/dev/null || true
pnpm --filter backend install --no-frozen-lockfile
