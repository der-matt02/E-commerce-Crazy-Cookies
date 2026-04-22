#!/bin/bash
set -e

echo "▶ [backend] pnpm run build"
pnpm --filter backend run build
