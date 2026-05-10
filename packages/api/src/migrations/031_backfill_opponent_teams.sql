-- 031: Backfill opponent_teams from historical games.opponent_name values.
--
-- For every game with a free-text opponent_name and no opponent_team_id,
-- create (or reuse) an opponent_teams row keyed on (home_team_id, normalized name)
-- and link the game to it. Scouting-mode games are excluded; their opponent_name
-- column carries different semantics (the away team in someone else's game).
--
-- Idempotent: re-runs are safe — Step A no-ops via ON CONFLICT, Step B finds no
-- orphans, Step C recomputes counts from current state.

-- Step A: insert one opponent_teams row per unique (home_team_id, normalized opponent_name).
-- The canonical display name is the most recent spelling we've seen.
INSERT INTO opponent_teams (team_id, name, normalized_name, games_played, last_game_date)
SELECT
    g.home_team_id,
    (array_agg(g.opponent_name ORDER BY g.game_date DESC))[1] AS name,
    regexp_replace(lower(trim(g.opponent_name)), '\s+', ' ', 'g') AS normalized_name,
    COUNT(*) AS games_played,
    MAX(g.game_date) AS last_game_date
FROM games g
WHERE g.opponent_name IS NOT NULL
  AND g.opponent_name <> ''
  AND g.opponent_team_id IS NULL
  AND g.charting_mode <> 'scouting'
GROUP BY g.home_team_id, regexp_replace(lower(trim(g.opponent_name)), '\s+', ' ', 'g')
ON CONFLICT (team_id, normalized_name) DO UPDATE
SET games_played = opponent_teams.games_played + EXCLUDED.games_played,
    last_game_date = GREATEST(opponent_teams.last_game_date, EXCLUDED.last_game_date),
    updated_at = NOW();

-- Step B: link orphan games to the opponent_teams row that matches their normalized name.
UPDATE games g
SET opponent_team_id = ot.id
FROM opponent_teams ot
WHERE g.opponent_team_id IS NULL
  AND g.opponent_name IS NOT NULL
  AND g.opponent_name <> ''
  AND g.charting_mode <> 'scouting'
  AND ot.team_id = g.home_team_id
  AND ot.normalized_name = regexp_replace(lower(trim(g.opponent_name)), '\s+', ' ', 'g');

-- Step C: reconcile games_played and last_game_date against the final games state.
-- Guarantees the migration is safely re-runnable without inflating counters.
UPDATE opponent_teams ot
SET games_played = sub.cnt,
    last_game_date = sub.max_date,
    updated_at = NOW()
FROM (
    SELECT opponent_team_id, COUNT(*) AS cnt, MAX(game_date) AS max_date
    FROM games
    WHERE opponent_team_id IS NOT NULL
    GROUP BY opponent_team_id
) sub
WHERE ot.id = sub.opponent_team_id;
