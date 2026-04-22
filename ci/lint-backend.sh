#!/bin/bash
set -e

echo "▶ [backend] pnpm run lint"
pnpm --filter backend run lint
