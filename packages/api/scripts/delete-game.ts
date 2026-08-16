// One-off: delete a single game and every record linked to it.
//
// Usage:
//   cd packages/api
//   npx ts-node scripts/delete-game.ts <gameId>            # dry-run: counts only
//   npx ts-node scripts/delete-game.ts <gameId> --confirm  # actually delete
//
// Most child tables CASCADE on `games.id` so a single DELETE FROM games
// takes care of them. The two exceptions we handle manually:
//   - performance_summaries: polymorphic source_type/source_id, no FK
//   - scouting_reports: ON DELETE SET NULL (so we leave it alone — the row
//     survives with game_id nullified). Counted for transparency.
//
// Runs inside a transaction. On any error, everything rolls back.

import { query, transaction } from '../src/config/database';
import pool from '../src/config/database';

// Tables with ON DELETE CASCADE from games.id — counted for the summary,
// removed implicitly by the games DELETE.
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

async function countRows(table: string, gameId: string): Promise<number> {
    const res = await query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE game_id = $1`, [gameId]);
    return res.rows[0].n;
}

async function main() {
    const gameId = process.argv[2];
    const confirm = process.argv.includes('--confirm');

    if (!gameId) {
        console.error('usage: delete-game <gameId> [--confirm]');
        process.exit(1);
    }

    // Verify the game exists first.
    const gameRes = await query(`SELECT id, opponent_name, game_date, charting_mode, status FROM games WHERE id = $1`, [gameId]);
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

    // Tally what will be removed.
    console.log('Linked record counts (CASCADE on game delete):');
    let total = 0;
    for (const t of CASCADE_TABLES) {
        const n = await countRows(t, gameId);
        console.log(`  ${t.padEnd(22)} ${n}`);
        total += n;
    }

    // Polymorphic — no FK, handled manually.
    const psRes = await query(
        `SELECT COUNT(*)::int AS n FROM performance_summaries WHERE source_type = 'game' AND source_id = $1`,
        [gameId]
    );
    const psCount = psRes.rows[0].n;
    console.log(`  ${'performance_summaries'.padEnd(22)} ${psCount}   (no FK; manual delete)`);
    total += psCount;

    // SET NULL — survives but is dereferenced.
    const srRes = await query(`SELECT COUNT(*)::int AS n FROM scouting_reports WHERE game_id = $1`, [gameId]);
    const srCount = srRes.rows[0].n;
    console.log(`  ${'scouting_reports'.padEnd(22)} ${srCount}   (FK ON DELETE SET NULL; row survives, game_id nulled)`);

    console.log('');
    console.log(`Total rows to delete: ${total} (+1 game)`);
    console.log(`Rows to nullify:      ${srCount}`);

    if (!confirm) {
        console.log('');
        console.log('Dry-run only. Re-run with --confirm to delete.');
        await pool.end();
        return;
    }

    console.log('');
    console.log('--confirm passed — deleting in a transaction…');

    await transaction(async (client) => {
        await client.query(`DELETE FROM performance_summaries WHERE source_type = 'game' AND source_id = $1`, [gameId]);
        const result = await client.query(`DELETE FROM games WHERE id = $1`, [gameId]);
        if (result.rowCount === 0) {
            throw new Error('Game vanished mid-transaction');
        }
    });

    console.log('✅ Game deleted.');
    await pool.end();
}

main().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
