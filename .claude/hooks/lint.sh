#!/usr/bin/env bash
set -e

# Read hook payload from Claude
INPUT=$(cat)

# Extract changed file path
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# If no file, do nothing
if [ -z "$FILE" ]; then
  exit 0
fi

# Get repo root (important for consistent paths)
ROOT=$(git rev-parse --show-toplevel)


# Frontend (React)
if [[ "$FILE" == frontend/* ]]; then
  cd "$ROOT/frontend"

  # run ONLY lint (no --fix)
  ./scripts/lint.sh "$FILE"
  exit $?
fi

# Backend (Deno)
if [[ "$FILE" == backend/* ]]; then
  cd "$ROOT/backend"

  # run Deno lint only
  ./scripts/lint.sh "$FILE"
  exit $?
fi

exit 0