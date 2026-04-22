#!/bin/bash
set -e

echo "▶ [frontend] pnpm run build"
pnpm --filter frontend run build
