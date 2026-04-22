#!/bin/bash

echo '=== Verificando archivos críticos del proyecto ==='

check_file() {
    if [ -f "$1" ]; then
        echo "✓ $1 — OK"
    else
        echo "✗ $1 — MISSING"
    fi
}

check_file 'docker-compose.yml'
check_file '.env.example'
check_file '.gitignore'
check_file 'pnpm-workspace.yaml'

TS_COUNT=$(find . -name '*.ts' -not -path '*/node_modules/*' -not -path '*/.next/*' | wc -l)
echo "Archivos TypeScript detectados: $TS_COUNT"

TODOS=$(grep -r 'TODO' --include='*.ts' --exclude-dir=node_modules -l 2>/dev/null | wc -l || echo 0)
echo "Archivos con TODOs pendientes: $TODOS"

echo '=== Health Check completado ==='
