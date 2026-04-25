#!/usr/bin/env bash
# Drops and recreates the local test database from scratch.
# Use this when you want a fully clean slate (e.g. after schema changes).
# Run from the repo root: ./scripts/reset-local-db.sh

set -e

PSQL="/c/Program Files/PostgreSQL/16/bin/psql"
PG_SUPER=postgres
PG_SUPER_PASS=localdev
DB=pitch_tracker_test
OWNER=bvolante

echo "⚠️   This will permanently destroy all data in '$DB' and rebuild from scratch."
read -rp "    Continue? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "    Aborted."
  exit 0
fi

echo ""
echo "🗑️   Dropping database '$DB'..."
PGPASSWORD="$PG_SUPER_PASS" "$PSQL" -U "$PG_SUPER" -h localhost -d postgres \
  -c "DROP DATABASE IF EXISTS ${DB}"

echo "🚀  Recreating database '$DB'..."
PGPASSWORD="$PG_SUPER_PASS" "$PSQL" -U "$PG_SUPER" -h localhost -d postgres \
  -c "CREATE DATABASE ${DB} OWNER ${OWNER}"

echo ""
./scripts/setup-local-db.sh
