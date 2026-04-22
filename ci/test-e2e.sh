#!/bin/bash
set -e

echo "▶ [backend] pnpm run test:e2e"
pnpm --filter backend run test:e2e
