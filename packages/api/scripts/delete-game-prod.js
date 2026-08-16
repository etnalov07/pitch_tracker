// Self-contained game-deletion script for PRODUCTION.
//
// No imports from src/ — uses pg + dotenv directly, both already in
// packages/api production node_modules. Drop this file next to the
// deployed API (e.g. ~/bt_api/delete-game-prod.js on the Namecheap box)
// and it picks up ~/bt_api/.env automatically.
//
// Usage on prod:
//   ssh <prod-host>
//   cd ~/bt_api
//   # scp this file up first, or paste it via a here-doc
//   node delete-game-prod.js <gameId>            # dry-run: counts only
//   node delete-game-prod.js <gameId> --confirm  # actually delete
//
// Then: rm delete-game-prod.js   (clean up — don't leave admin tools on prod)
//
// Most child tables CASCADE on games.id. Two exceptions handled here:
//   - performance_summaries: polymorphic source_type/source_id, no FK
//   - scouting_reports: ON DELETE SET NULL — row survives, game_id nulled
//
// Runs in a transaction. Any error → ROLLBACK.

require('dotenv').config();
const { Pool } = require('pg');

const CASCADE_TABLES = [
    'innings',
    'at_bats',
    'pitches',
    'baserunner_events',
    'game_pitchers',
    'opponent_lineup',
    'opposing_pitchers',
    'my_team_lineup',
    'game_roles',
    'pitch_calls',
];

async function main() {
    const gameId = process.argv[2];
    const confirm = process.argv.includes('--confirm');

    if (!gameId) {
        console.error('usage: node delete-game-prod.js <gameId> [--confirm]');
        process.exit(1);
    }

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 5,
    });

    console.log('--- PRODUCTION GAME DELETE ---');
    console.log(`DB host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`DB name: ${process.env.DB_NAME}`);
    console.log(`Game ID: ${gameId}`);
    console.log(`Mode:    ${confirm ? 'CONFIRM (will delete)' : 'dry-run (no changes)'}`);
    console.log('');

    try {
        const gameRes = await pool.query(`SELECT id, opponent_name, game_date, charting_mode, status FROM games WHERE id = $1`, [
            gameId,
        ]);
        if (gameRes.rows.length === 0) {
            console.error(`Game ${gameId} not found.`);
            process.exit(1);
        }
        const g = gameRes.rows[0];
        console.log(`Game found: ${g.id}`);
        console.log(`  opponent:     ${g.opponent_name}`);
        console.log(`  game_date:    ${g.game_date}`);
        console.log(`  charting:     ${g.charting_mode}`);
        console.log(`  status:       ${g.status}`);
        console.log('');

        console.log('Linked record counts (CASCADE on game delete):');
        let total = 0;
        for (const t of CASCADE_TABLES) {
            const res = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t} WHERE game_id = $1`, [gameId]);
            const n = res.rows[0].n;
            console.log(`  ${t.padEnd(22)} ${n}`);
            total += n;
        }

        const psRes = await pool.query(
            `SELECT COUNT(*)::int AS n FROM performance_summaries WHERE source_type = 'game' AND source_id = $1`,
            [gameId]
        );
        const psCount = psRes.rows[0].n;
        console.log(`  ${'performance_summaries'.padEnd(22)} ${psCount}   (no FK; manual delete)`);
        total += psCount;

        const srRes = await pool.query(`SELECT COUNT(*)::int AS n FROM scouting_reports WHERE game_id = $1`, [gameId]);
        const srCount = srRes.rows[0].n;
        console.log(`  ${'scouting_reports'.padEnd(22)} ${srCount}   (ON DELETE SET NULL; survives, game_id nulled)`);

        console.log('');
        console.log(`Total rows to delete: ${total} (+1 game)`);
        console.log(`Rows to nullify:      ${srCount}`);

        if (!confirm) {
            console.log('');
            console.log('Dry-run only. Re-run with --confirm to delete.');
            return;
        }

        console.log('');
        console.log('--confirm passed — deleting in a transaction…');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`DELETE FROM performance_summaries WHERE source_type = 'game' AND source_id = $1`, [gameId]);
            const result = await client.query(`DELETE FROM games WHERE id = $1`, [gameId]);
            if (result.rowCount === 0) {
                throw new Error('Game vanished mid-transaction');
            }
            await client.query('COMMIT');
            console.log('Game deleted.');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
