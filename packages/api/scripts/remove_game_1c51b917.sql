-- Remove game 1c51b917-17be-49c1-add6-a794622194df from production.
--
-- Portable across psql / DBeaver / pgAdmin / any Postgres client. Run as a
-- transaction so you can ROLLBACK if the preview counts look wrong:
--
--   psql:    psql "$PROD_DATABASE_URL" -f packages/api/scripts/remove_game_1c51b917.sql
--            (then type COMMIT; or ROLLBACK; at the prompt)
--   DBeaver/pgAdmin: open in a SQL editor that keeps the transaction open
--            between statements (DBeaver: turn OFF auto-commit before running),
--            run the whole script, inspect the results, then run COMMIT; or
--            ROLLBACK; in the same session.
--
-- FK landscape (verified against packages/api/src/schema/dump.sql):
--   CASCADE on games.id  → at_bats, baserunner_events, game_pitchers,
--                          game_roles, innings, my_team_lineup,
--                          opponent_lineup, opposing_pitchers,
--                          pitch_calls, pitches
--   SET NULL on games.id → scouting_reports (intentional — reports survive)
--   No DB-level FK       → performance_summaries (polymorphic source_type/
--                          source_id) — must be deleted manually below.
--   Indirect cascades    → plays via at_bats, opponent_lineup_profiles via
--                          opponent_lineup, etc. — handled automatically.

BEGIN;

-- ── Preview: confirm this is the right game ──────────────────────────────
SELECT
    g.id,
    g.game_date,
    g.opponent_name,
    g.home_team_id,
    g.status,
    g.home_score,
    g.away_score,
    g.charting_mode,
    g.created_at,
    (SELECT COUNT(*) FROM pitches  p WHERE p.game_id  = g.id) AS pitch_count,
    (SELECT COUNT(*) FROM at_bats  a WHERE a.game_id  = g.id) AS at_bat_count
FROM games g
WHERE g.id = '1c51b917-17be-49c1-add6-a794622194df'::uuid;

-- ── Preview: row counts that will be removed (cascade or manual) ─────────
SELECT 'at_bats'                                                     AS source, COUNT(*) FROM at_bats             WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'baserunner_events',                                          COUNT(*) FROM baserunner_events   WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'game_pitchers',                                              COUNT(*) FROM game_pitchers       WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'game_roles',                                                 COUNT(*) FROM game_roles          WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'innings',                                                    COUNT(*) FROM innings             WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'my_team_lineup',                                             COUNT(*) FROM my_team_lineup      WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'opponent_lineup',                                            COUNT(*) FROM opponent_lineup     WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'opposing_pitchers',                                          COUNT(*) FROM opposing_pitchers   WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'pitch_calls',                                                COUNT(*) FROM pitch_calls         WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'pitches',                                                    COUNT(*) FROM pitches             WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'performance_summaries (manual)',
                 COUNT(*) FROM performance_summaries
                 WHERE source_type = 'game' AND source_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid
UNION ALL SELECT 'scouting_reports (will be SET NULL, not deleted)',
                 COUNT(*) FROM scouting_reports WHERE game_id = '1c51b917-17be-49c1-add6-a794622194df'::uuid;

-- ── Manual delete: performance_summaries (polymorphic, no FK cascade) ────
DELETE FROM performance_summaries
WHERE source_type = 'game'
  AND source_id  = '1c51b917-17be-49c1-add6-a794622194df'::uuid;

-- ── Cascade delete: this triggers all child CASCADEs ─────────────────────
DELETE FROM games WHERE id = '1c51b917-17be-49c1-add6-a794622194df'::uuid;

-- ── Verify exactly one game removed ──────────────────────────────────────
SELECT COUNT(*) AS games_remaining_with_that_id
FROM games WHERE id = '1c51b917-17be-49c1-add6-a794622194df'::uuid;   -- expect 0

-- If the preview counts and the "0" check both look right:
--   COMMIT;
-- If anything looks off:
--   ROLLBACK;
