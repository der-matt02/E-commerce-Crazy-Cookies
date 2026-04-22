#!/bin/bash
set -e

echo "▶ [frontend] pnpm run lint"
pnpm --filter frontend run lint
