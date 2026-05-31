#!/usr/bin/env bash
set -e

FILE="$1"

if [ -z "$FILE" ]; then
  deno lint .
  exit 0
fi

deno lint "$FILE"
