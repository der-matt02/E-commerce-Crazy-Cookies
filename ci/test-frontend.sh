#!/bin/bash
set -e

echo "▶ [frontend] pnpm run test"
pnpm --filter frontend run test
