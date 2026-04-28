#!/bin/bash
set -e

which pnpm || npm install -g pnpm@8
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
rm -rf node_modules 2>/dev/null || true
echo "Entorno listo — node_modules limpiado"
