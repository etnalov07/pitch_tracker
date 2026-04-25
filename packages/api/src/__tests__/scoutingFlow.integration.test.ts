/**
 * Scouting Game Flow — End-to-End Integration Test
 *
 * Follows the scouting game flow PDF step by step against a real Postgres DB.
 * No mocks — every HTTP call goes through the full Express stack and hits the DB.
 *
 * Prerequisites:
 *   1. Postgres 16 running locally (postgresql-x64-16 service)
 *   2. npm run db:setup        (loads schema + migrations)
 *   3. npm run test:integration (runs this file)
 *
 * Game played: 1 inning, 3 batters per side, all strikeouts (3 pitches each).
 *   → 6 at-bats, 18 pitches total, final score 0–0.
 */

import request from 'supertest';
import app from '../app';
import { query } from '../config/database';

// ─── Shared state threaded through the sequential test steps ─────────────────

const ctx = {
    token: '',
    userId: '',
    teamId: '',
    opponentTeamId: '',
    gameId: '',
    inningTopId: '',
    inningBotId: '',
    pitcherId: '',
    lineupHome: [] as Array<{ id: string; player_name: string }>,
    lineupAway: [] as Array<{ id: string; player_name: string }>,
};

// Unique suffix prevents email collisions across parallel / repeated runs
const RUN = Date.now().toString(36);
const TEST_EMAIL = `scout+${RUN}@pitchchart.local`;
const HOME_TEAM_NAME = `River Dogs ${RUN}`;
const AWAY_TEAM_NAME = `Steel Hawks ${RUN}`;

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
    // Register a fresh test user
    const reg = await request(app).post('/bt-api/auth/register').send({
        email: TEST_EMAIL,
        password: 'TestPass123!',
        first_name: 'Scout',
        last_name: 'Tester',
    });
    expect(reg.status).toBe(201);
    ctx.token = reg.body.token;
    ctx.userId = reg.body.user.id;

    // Create the owning team (home_team_id FK anchor — not displayed in scouting games)
    const team = await request(app)
        .post('/bt-api/teams')
        .set('Authorization', `Bearer ${ctx.token}`)
        .send({ name: `Scout Owner Team ${RUN}`, city: 'Testville' });
    expect(team.status).toBe(201);
    ctx.teamId = team.body.team.id;

    // Register the away team in the opponent registry so auto-link can run
    const opp = await request(app)
        .post(`/bt-api/teams/${ctx.teamId}/opponents`)
        .set('Authorization', `Bearer ${ctx.token}`)
        .send({ name: AWAY_TEAM_NAME });
    expect(opp.status).toBe(201);
    ctx.opponentTeamId = opp.body.opponent.id;
});

afterAll(async () => {
    // Delete in FK dependency order. Each step ignores errors — partial cleanup is fine.
    if (ctx.gameId) {
        // opposing_pitchers may not cascade from game deletion
        await query('DELETE FROM opposing_pitchers WHERE game_id = $1', [ctx.gameId]).catch(() => {});
        await query('DELETE FROM games WHERE id = $1', [ctx.gameId]).catch(() => {});
    }
    if (ctx.teamId) {
        // Cascades to: team_members, batter_scouting_profiles, opponent_teams, opponent_pitcher_profiles
        await query('DELETE FROM teams WHERE id = $1', [ctx.teamId]).catch(() => {});
    }
    if (ctx.userId) {
        await query('DELETE FROM users WHERE id = $1', [ctx.userId]).catch(() => {});
    }
});

// ─── Step 1: Game creation ────────────────────────────────────────────────────

describe('Step 1 — Game creation', () => {
    it('creates a scouting game with both opponent team names', async () => {
        const res = await request(app).post('/bt-api/games').set('Authorization', `Bearer ${ctx.token}`).send({
            home_team_id: ctx.teamId,
            charting_mode: 'scouting',
            opponent_name: AWAY_TEAM_NAME,
            scouting_home_team: HOME_TEAM_NAME,
            opponent_team_id: ctx.opponentTeamId,
            game_date: '2026-05-01',
            location: 'Test Diamond',
            total_innings: 1,
            is_home_game: true,
        });

        expect(res.status).toBe(201);
        expect(res.body.game.charting_mode).toBe('scouting');
        expect(res.body.game.opponent_name).toBe(AWAY_TEAM_NAME);
        expect(res.body.game.scouting_home_team).toBe(HOME_TEAM_NAME);
        expect(res.body.game.status).toBe('scheduled');
        ctx.gameId = res.body.game.id;
        expect(ctx.gameId).toBeTruthy();
    });
});

// ─── Step 2: Opponent lineup ──────────────────────────────────────────────────

describe('Step 2 — Opponent lineup', () => {
    it('bulk-creates 3 home batters (team_side: home)', async () => {
        const res = await request(app)
            .post(`/bt-api/opponent-lineup/game/${ctx.gameId}/bulk`)
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({
                players: [
                    { player_name: 'Home Batter 1', batting_order: 1, bats: 'R', position: 'SS', team_side: 'home' },
                    { player_name: 'Home Batter 2', batting_order: 2, bats: 'L', position: 'CF', team_side: 'home' },
                    { player_name: 'Home Batter 3', batting_order: 3, bats: 'R', position: '1B', team_side: 'home' },
                ],
            });

        expect(res.status).toBe(201);
        ctx.lineupHome = res.body.lineup;
        expect(ctx.lineupHome).toHaveLength(3);
        expect(ctx.lineupHome[0].player_name).toBe('Home Batter 1');
    });

    it('bulk-creates 3 away batters (team_side: away)', async () => {
        const res = await request(app)
            .post(`/bt-api/opponent-lineup/game/${ctx.gameId}/bulk`)
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({
                players: [
                    { player_name: 'Away Batter 1', batting_order: 1, bats: 'R', position: '2B', team_side: 'away' },
                    { player_name: 'Away Batter 2', batting_order: 2, bats: 'L', position: 'LF', team_side: 'away' },
                    { player_name: 'Away Batter 3', batting_order: 3, bats: 'R', position: 'C', team_side: 'away' },
                ],
            });

        expect(res.status).toBe(201);
        ctx.lineupAway = res.body.lineup;
        expect(ctx.lineupAway).toHaveLength(3);
    });

    it('lineup endpoint returns all 6 players', async () => {
        const res = await request(app)
            .get(`/bt-api/opponent-lineup/game/${ctx.gameId}`)
            .set('Authorization', `Bearer ${ctx.token}`);

        expect(res.status).toBe(200);
        expect(res.body.lineup).toHaveLength(6);
    });
});

// ─── Step 3: Game start ───────────────────────────────────────────────────────

describe('Step 3 — Game start', () => {
    it('transitions game to in_progress and creates inning 1 top', async () => {
        const res = await request(app).post(`/bt-api/games/${ctx.gameId}/start`).set('Authorization', `Bearer ${ctx.token}`);

        expect(res.status).toBe(200);
        expect(res.body.game.status).toBe('in_progress');
        expect(res.body.game.current_inning).toBe(1);
        expect(res.body.game.inning_half).toBe('top');
    });

    it('current-inning returns inning 1 top with a real id', async () => {
        const res = await request(app)
            .get(`/bt-api/games/${ctx.gameId}/current-inning`)
            .set('Authorization', `Bearer ${ctx.token}`);

        expect(res.status).toBe(200);
        expect(res.body.inning.inning_number).toBe(1);
        expect(res.body.inning.half).toBe('top');
        ctx.inningTopId = res.body.inning.id;
        expect(ctx.inningTopId).toBeTruthy();
    });
});

// ─── Step 4: Opposing pitcher ─────────────────────────────────────────────────

describe('Step 4 — Opposing pitcher registration', () => {
    it('registers the away team pitcher who throws to home batters', async () => {
        const res = await request(app).post('/bt-api/opposing-pitchers').set('Authorization', `Bearer ${ctx.token}`).send({
            game_id: ctx.gameId,
            team_name: AWAY_TEAM_NAME,
            pitcher_name: 'Away Pitcher 1',
            throws: 'R',
            team_side: 'away',
        });

        expect(res.status).toBe(201);
        ctx.pitcherId = res.body.pitcher.id;
        expect(ctx.pitcherId).toBeTruthy();
    });
});

// ─── Shared helper: one strikeout at-bat (3 pitches) ─────────────────────────
//
// Plays: called_strike → swinging_strike → swinging_strike (K)
// Returns the at-bat ID.

async function strikeoutAtBat(batterId: string, battingOrder: number, outsBefore: number): Promise<string> {
    // Create at-bat
    const ab = await request(app).post('/bt-api/at-bats').set('Authorization', `Bearer ${ctx.token}`).send({
        game_id: ctx.gameId,
        inning_id: ctx.inningTopId, // will be swapped to inningBotId by caller if needed
        opposing_pitcher_id: ctx.pitcherId,
        opponent_batter_id: batterId,
        batting_order: battingOrder,
        outs_before: outsBefore,
    });
    expect(ab.status).toBe(201);
    const atBatId: string = ab.body.atBat.id;

    // Pitch sequence: CS, SS, SS → strikeout
    const pitches = [
        {
            result: 'called_strike',
            balls: 0,
            strikes: 0,
            pitch_number: 1,
            pitch_type: 'fastball',
            velo: 90,
            x: 0.5,
            y: 0.5,
            zone: 5,
        },
        {
            result: 'swinging_strike',
            balls: 0,
            strikes: 1,
            pitch_number: 2,
            pitch_type: 'slider',
            velo: 83,
            x: 0.65,
            y: 0.45,
            zone: 14,
        },
        {
            result: 'swinging_strike',
            balls: 0,
            strikes: 2,
            pitch_number: 3,
            pitch_type: 'curveball',
            velo: 77,
            x: 0.6,
            y: 0.35,
            zone: 14,
        },
    ];

    for (const p of pitches) {
        const pitch = await request(app).post('/bt-api/pitches').set('Authorization', `Bearer ${ctx.token}`).send({
            at_bat_id: atBatId,
            game_id: ctx.gameId,
            opponent_batter_id: batterId,
            pitch_type: p.pitch_type,
            pitch_result: p.result,
            location_x: p.x,
            location_y: p.y,
            zone: p.zone,
            velocity: p.velo,
            balls_before: p.balls,
            strikes_before: p.strikes,
            pitch_number: p.pitch_number,
            team_side: 'opponent',
        });
        expect(pitch.status).toBe(201);
    }

    // End at-bat
    const end = await request(app)
        .post(`/bt-api/at-bats/${atBatId}/end`)
        .set('Authorization', `Bearer ${ctx.token}`)
        .send({ result: 'strikeout', outs_after: outsBefore + 1 });
    expect(end.status).toBe(200);
    expect(end.body.atBat.result).toBe('strikeout');
    expect(end.body.atBat.outs_after).toBe(outsBefore + 1);

    return atBatId;
}

// ─── Step 5: Top of inning 1 (home team bats) ────────────────────────────────

describe('Step 5 — Top of inning 1: home batters face away pitcher', () => {
    it('batter 1 (home) strikes out — 1 out', async () => {
        await strikeoutAtBat(ctx.lineupHome[0].id, 1, 0);
    });

    it('batter 2 (home) strikes out — 2 outs', async () => {
        await strikeoutAtBat(ctx.lineupHome[1].id, 2, 1);
    });

    it('batter 3 (home) strikes out — 3 outs, half-inning over', async () => {
        await strikeoutAtBat(ctx.lineupHome[2].id, 3, 2);
    });
});

// ─── Step 6: Advance inning ───────────────────────────────────────────────────

describe('Step 6 — Advance inning (top 1 → bottom 1)', () => {
    it('advances from top of 1 to bottom of 1', async () => {
        const res = await request(app)
            .post(`/bt-api/games/${ctx.gameId}/advance-inning`)
            .set('Authorization', `Bearer ${ctx.token}`);

        expect(res.status).toBe(200);
        expect(res.body.game.current_inning).toBe(1);
        expect(res.body.game.inning_half).toBe('bottom');
    });

    it('current-inning now shows bottom 1 with a new id', async () => {
        const res = await request(app)
            .get(`/bt-api/games/${ctx.gameId}/current-inning`)
            .set('Authorization', `Bearer ${ctx.token}`);

        expect(res.status).toBe(200);
        expect(res.body.inning.half).toBe('bottom');
        ctx.inningBotId = res.body.inning.id;
        expect(ctx.inningBotId).toBeTruthy();
        expect(ctx.inningBotId).not.toBe(ctx.inningTopId);
    });
});

// ─── Step 7: Bottom of inning 1 (away team bats) ─────────────────────────────
//
// Need a pitcher for the away team now. Re-use the existing pitcher record
// (in practice you'd add a home pitcher, but for the flow test it doesn't matter).

describe('Step 7 — Bottom of inning 1: away batters', () => {
    // Swap the inning id helper uses before these at-bats
    beforeAll(() => {
        ctx.inningTopId = ctx.inningBotId; // stripe helper reads inningTopId
    });

    it('batter 1 (away) strikes out — 1 out', async () => {
        await strikeoutAtBat(ctx.lineupAway[0].id, 1, 0);
    });

    it('batter 2 (away) strikes out — 2 outs', async () => {
        await strikeoutAtBat(ctx.lineupAway[1].id, 2, 1);
    });

    it('batter 3 (away) strikes out — 3 outs, game can end', async () => {
        await strikeoutAtBat(ctx.lineupAway[2].id, 3, 2);
    });
});

// ─── Step 8: End game ─────────────────────────────────────────────────────────

describe('Step 8 — End game', () => {
    it('transitions game status to completed', async () => {
        const res = await request(app).post(`/bt-api/games/${ctx.gameId}/end`).set('Authorization', `Bearer ${ctx.token}`);

        expect(res.status).toBe(200);
        expect(res.body.game.status).toBe('completed');
    });
});

// ─── Step 9: Final state verification ────────────────────────────────────────

describe('Step 9 — Final state in the DB', () => {
    it('game row has status=completed and correct charting_mode', async () => {
        const { rows } = await query('SELECT status, charting_mode, scouting_home_team FROM games WHERE id = $1', [ctx.gameId]);
        expect(rows[0].status).toBe('completed');
        expect(rows[0].charting_mode).toBe('scouting');
        expect(rows[0].scouting_home_team).toBe(HOME_TEAM_NAME);
    });

    it('6 at-bats were recorded (3 per half-inning)', async () => {
        const { rows } = await query('SELECT COUNT(*)::int AS n FROM at_bats WHERE game_id = $1', [ctx.gameId]);
        expect(rows[0].n).toBe(6);
    });

    it('18 pitches were recorded (3 per at-bat × 6 at-bats)', async () => {
        const { rows } = await query('SELECT COUNT(*)::int AS n FROM pitches WHERE game_id = $1', [ctx.gameId]);
        expect(rows[0].n).toBe(18);
    });

    it('all pitches have team_side = opponent', async () => {
        const { rows } = await query("SELECT COUNT(*)::int AS n FROM pitches WHERE game_id = $1 AND team_side != 'opponent'", [
            ctx.gameId,
        ]);
        expect(rows[0].n).toBe(0);
    });

    it('auto-link created batter_scouting_profiles for all 6 scouted batters', async () => {
        // Auto-linking runs fire-and-forget; allow up to 2s for it to settle
        await new Promise((r) => setTimeout(r, 2000));

        const { rows } = await query(
            `SELECT COUNT(*)::int AS n
             FROM batter_scouting_profiles
             WHERE team_id = $1`,
            [ctx.teamId]
        );
        expect(rows[0].n).toBe(6);
    });

    it('2 inning records were created (top and bottom of inning 1)', async () => {
        const { rows } = await query('SELECT COUNT(*)::int AS n FROM innings WHERE game_id = $1', [ctx.gameId]);
        expect(rows[0].n).toBe(2);
    });

    it('opposing pitcher row exists with correct game link', async () => {
        const { rows } = await query('SELECT pitcher_name, team_side FROM opposing_pitchers WHERE id = $1', [ctx.pitcherId]);
        expect(rows[0].pitcher_name).toBe('Away Pitcher 1');
        expect(rows[0].team_side).toBe('away');
    });
});
