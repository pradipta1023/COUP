#!/usr/bin/env bash
set -e

FILE="$1"

if [ -z "$FILE" ]; then
  npx eslint . --max-warnings=0
  npx tsc --noEmit
  exit 0
fi

# Lint only the changed file, then run type-check
npx eslint "$FILE" --max-warnings=0
npx tsc --noEmit
