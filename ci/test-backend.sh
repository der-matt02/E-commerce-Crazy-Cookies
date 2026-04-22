#!/bin/bash
set -e

echo "▶ [backend] pnpm run test"
pnpm --filter backend run test
