#!/usr/bin/env bash
set -e

echo "🧱 Running STOP checks (full system validation)..."

ROOT=$(git rev-parse --show-toplevel)

echo "🟦 Frontend checks..."
cd "$ROOT/frontend"

npx eslint .
npx tsc --noEmit

echo "🟩 Backend checks..."
cd "$ROOT/backend"

deno lint .
deno test --permit-no-files src/

echo "✅ All STOP checks passed"