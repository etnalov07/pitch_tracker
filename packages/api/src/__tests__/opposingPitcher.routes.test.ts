// Opposing Pitcher routes test — verifies CRUD contract and required-field validation.

jest.mock('../services/opposingPitcher.service', () => ({
    __esModule: true,
    default: {
        getByGame: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));

import { getAgent, authHeader, resetMocks } from './helpers/setup';
import opposingPitcherService from '../services/opposingPitcher.service';

const svc = opposingPitcherService as jest.Mocked<typeof opposingPitcherService>;

const mockPitcher = {
    id: 'op-1',
    game_id: 'game-1',
    team_name: 'Opponents',
    pitcher_name: 'Karson Schulz',
    jersey_number: 22,
    throws: 'R' as const,
    team_side: 'away' as const,
    created_at: '2026-01-01',
};

describe('Opposing Pitcher Routes - /bt-api/opposing-pitchers', () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    // =========================================================================
    // GET /game/:gameId
    // =========================================================================

    describe('GET /game/:gameId', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/opposing-pitchers/game/game-1');
            expect(res.status).toBe(401);
        });

        it('returns list of opposing pitchers for the game', async () => {
            svc.getByGame.mockResolvedValueOnce([mockPitcher]);

            const res = await getAgent()
                .get('/bt-api/opposing-pitchers/game/game-1')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitchers).toHaveLength(1);
            expect(res.body.pitchers[0].pitcher_name).toBe('Karson Schulz');
            expect(svc.getByGame).toHaveBeenCalledWith('game-1', undefined);
        });

        it('forwards team_side query param to service', async () => {
            svc.getByGame.mockResolvedValueOnce([]);

            await getAgent()
                .get('/bt-api/opposing-pitchers/game/game-1?team_side=away')
                .set('Authorization', authHeader());

            expect(svc.getByGame).toHaveBeenCalledWith('game-1', 'away');
        });

        it('returns empty array when no opposing pitchers exist', async () => {
            svc.getByGame.mockResolvedValueOnce([]);

            const res = await getAgent()
                .get('/bt-api/opposing-pitchers/game/game-1')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitchers).toEqual([]);
        });
    });

    // =========================================================================
    // POST /
    // =========================================================================

    describe('POST /', () => {
        const validPayload = {
            game_id: 'game-1',
            team_name: 'Opponents',
            pitcher_name: 'Karson Schulz',
            throws: 'R',
            jersey_number: '22',
            team_side: 'away',
        };

        it('returns 401 without auth token', async () => {
            const res = await getAgent().post('/bt-api/opposing-pitchers').send(validPayload);
            expect(res.status).toBe(401);
        });

        it('creates a new opposing pitcher', async () => {
            svc.create.mockResolvedValueOnce(mockPitcher);

            const res = await getAgent()
                .post('/bt-api/opposing-pitchers')
                .set('Authorization', authHeader())
                .send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.pitcher.pitcher_name).toBe('Karson Schulz');
            expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ pitcher_name: 'Karson Schulz' }));
        });

        it('returns 400 when game_id is missing', async () => {
            const res = await getAgent()
                .post('/bt-api/opposing-pitchers')
                .set('Authorization', authHeader())
                .send({ team_name: 'Opponents', pitcher_name: 'Schulz', throws: 'R' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/game_id/i);
        });

        it('returns 400 when pitcher_name is missing', async () => {
            const res = await getAgent()
                .post('/bt-api/opposing-pitchers')
                .set('Authorization', authHeader())
                .send({ game_id: 'game-1', team_name: 'Opponents', throws: 'R' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when throws is missing', async () => {
            const res = await getAgent()
                .post('/bt-api/opposing-pitchers')
                .set('Authorization', authHeader())
                .send({ game_id: 'game-1', team_name: 'Opponents', pitcher_name: 'Schulz' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when team_name is missing', async () => {
            const res = await getAgent()
                .post('/bt-api/opposing-pitchers')
                .set('Authorization', authHeader())
                .send({ game_id: 'game-1', pitcher_name: 'Schulz', throws: 'R' });

            expect(res.status).toBe(400);
        });
    });

    // =========================================================================
    // PUT /:id
    // =========================================================================

    describe('PUT /:id', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().put('/bt-api/opposing-pitchers/op-1').send({ pitcher_name: 'Updated' });
            expect(res.status).toBe(401);
        });

        it('updates an opposing pitcher', async () => {
            const updated = { ...mockPitcher, pitcher_name: 'Updated Name' };
            svc.update.mockResolvedValueOnce(updated);

            const res = await getAgent()
                .put('/bt-api/opposing-pitchers/op-1')
                .set('Authorization', authHeader())
                .send({ pitcher_name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.pitcher.pitcher_name).toBe('Updated Name');
            expect(svc.update).toHaveBeenCalledWith('op-1', { pitcher_name: 'Updated Name' });
        });
    });

    // =========================================================================
    // DELETE /:id
    // =========================================================================

    describe('DELETE /:id', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().delete('/bt-api/opposing-pitchers/op-1');
            expect(res.status).toBe(401);
        });

        it('deletes an opposing pitcher and returns 204', async () => {
            svc.delete.mockResolvedValueOnce(undefined);

            const res = await getAgent()
                .delete('/bt-api/opposing-pitchers/op-1')
                .set('Authorization', authHeader());

            expect(res.status).toBe(204);
            expect(svc.delete).toHaveBeenCalledWith('op-1');
        });
    });
});
