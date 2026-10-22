#!/usr/bin/env bash
# Migrations only move forward: a pull request may add new migration folders,
# but never edit, rename or delete one that already exists. Prisma records
# applied migrations and never re-runs them, so an edited migration silently
# leaves staging and production different from a fresh database.
# Usage: scripts/check-migrations.sh <base ref>   (CI passes origin/<base branch>)
set -euo pipefail
base="${1:?base ref, for example origin/dev}"
changes=$(git diff --name-status "$base"...HEAD -- prisma/migrations)
bad=$(printf '%s\n' "$changes" | grep -v '^$' | grep -v '^A' || true)
if [ -n "$bad" ]; then
  echo "::error::Existing migrations were changed. Add a new migration instead (see CONTRIBUTING.md, Database changes):"
  printf '%s\n' "$bad"
  exit 1
fi
echo "OK: migrations only added${changes:+:}"
printf '%s\n' "$changes" | grep -v '^$' || true
