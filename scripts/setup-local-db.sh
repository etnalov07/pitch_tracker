#!/usr/bin/env bash
# Sets up the local test database from scratch using the locally installed PostgreSQL.
# Safe to re-run — schema uses IF NOT EXISTS and migrations use IF NOT EXISTS guards.
# Run from the repo root: ./scripts/setup-local-db.sh

set -e

PSQL="/c/Program Files/PostgreSQL/16/bin/psql"
PG_SUPER=postgres
PG_SUPER_PASS=localdev
DB=pitch_tracker_test
OWNER=bvolante
OWNER_PASS=localdev
APP_USER=bvolante_pitch_tracker
APP_PASS=localdev

# Helper: run SQL as the postgres superuser
super() {
  PGPASSWORD="$PG_SUPER_PASS" "$PSQL" -U "$PG_SUPER" -h localhost "$@"
}

# Helper: run SQL as the schema owner (bvolante)
owner() {
  PGPASSWORD="$OWNER_PASS" "$PSQL" -U "$OWNER" -h localhost "$@"
}

# ── 1. Create the schema-owner role ───────────────────────────────────────────
echo "👤  Ensuring role '$OWNER' exists..."
super -d postgres -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${OWNER}') THEN
    CREATE ROLE ${OWNER} WITH SUPERUSER LOGIN PASSWORD '${OWNER_PASS}';
    RAISE NOTICE 'Created role ${OWNER}';
  ELSE
    RAISE NOTICE 'Role ${OWNER} already exists, skipping';
  END IF;
END
\$\$;"

# ── 2. Create the test database ───────────────────────────────────────────────
echo "🗄️   Ensuring database '$DB' exists..."
DB_EXISTS=$(super -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB}'")
if [ "$DB_EXISTS" != "1" ]; then
  super -d postgres -c "CREATE DATABASE ${DB} OWNER ${OWNER}"
  echo "    Created database '$DB'"
else
  echo "    Database '$DB' already exists, skipping"
fi

# ── 3. Create the app-level role ──────────────────────────────────────────────
echo "👤  Ensuring role '$APP_USER' exists..."
super -d "$DB" -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_USER}') THEN
    CREATE ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_PASS}';
    RAISE NOTICE 'Created role ${APP_USER}';
  ELSE
    RAISE NOTICE 'Role ${APP_USER} already exists, skipping';
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE ${DB} TO ${APP_USER};"

# ── 4. Load the base schema ───────────────────────────────────────────────────
# Errors are allowed: Postgres 16 has gen_random_uuid() built-in so the
# public.gen_random_uuid() definition in the dump will fail harmlessly.
# All table/index/trigger CREATE statements are also safe to fail on re-runs.
echo "📐  Loading base schema..."
owner -d "$DB" \
  --set ON_ERROR_STOP=0 \
  -f packages/api/src/schema/db-schema.sql > /dev/null 2>&1
echo "    Base schema loaded"

# ── 5. Apply migrations not yet in the snapshot ───────────────────────────────
# Each migration uses IF NOT EXISTS / IF EXISTS guards — safe to re-run.
echo "🔄  Applying pending migrations (022-027)..."
for migration in \
  packages/api/src/migrations/022_pitches_nullable_pitcher.sql \
  packages/api/src/migrations/023_baserunner_event_types.sql \
  packages/api/src/migrations/024_performance_summaries_per_pitcher.sql \
  packages/api/src/migrations/025_scouting_mode.sql \
  packages/api/src/migrations/026_scouting_summary.sql \
  packages/api/src/migrations/027_opponent_teams.sql
do
  echo "    → $(basename "$migration")"
  owner -d "$DB" \
    --set ON_ERROR_STOP=0 \
    -f "$migration" > /dev/null 2>&1
done
echo "    Migrations done"

# ── 6. Grant permissions to app user ─────────────────────────────────────────
echo "🔑  Granting schema permissions to '$APP_USER'..."
owner -d "$DB" -c "
GRANT USAGE ON SCHEMA public TO ${APP_USER};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_USER};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};"

# ── 7. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "✅  Local database is ready"
echo ""
echo "  Host:      localhost:5432"
echo "  Database:  $DB"
echo "  App user:  $APP_USER  /  $APP_PASS"
echo "  Owner:     $OWNER     /  $OWNER_PASS"
echo ""
echo "  Quick check:"
echo "    npm run db:psql"
