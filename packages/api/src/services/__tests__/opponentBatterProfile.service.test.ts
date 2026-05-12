import { OpponentBatterProfileService } from '../opponentBatterProfile.service';

jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-profile-id'),
}));

import { query, transaction } from '../../config/database';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('OpponentBatterProfileService — standalone CRUD (Phase 1.3)', () => {
    let service: OpponentBatterProfileService;

    beforeEach(() => {
        service = new OpponentBatterProfileService();
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('inserts a new batter profile and snapshots opponent_team_name', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ team_id: 'team-1', name: 'Johnson HS' }] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            const inserted = {
                id: 'test-profile-id',
                team_id: 'team-1',
                opponent_team_id: 'opp-1',
                opponent_team_name: 'Johnson HS',
                player_name: 'Alex Wright',
                normalized_name: 'alex wright',
                bats: 'L',
                jersey_number: 4,
            };
            mockQuery.mockResolvedValueOnce({ rows: [inserted] } as never);

            const result = await service.create('opp-1', { player_name: 'Alex Wright', bats: 'L', jersey_number: 4 });

            expect(result).toEqual(inserted);
            const insertCall = mockQuery.mock.calls[2];
            expect(insertCall[0]).toContain('INSERT INTO batter_scouting_profiles');
            expect(insertCall[1]).toEqual([
                'test-profile-id',
                'team-1',
                'opp-1',
                'Johnson HS',
                'Alex Wright',
                'alex wright',
                'L',
                4,
            ]);
        });

        it('throws 409 with existing row when duplicate name on the same opponent team', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ team_id: 'team-1', name: 'Johnson HS' }] } as never);
            const existing = { id: 'existing-id', player_name: 'Alex Wright' };
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);

            await expect(service.create('opp-1', { player_name: 'Alex Wright', bats: 'L' })).rejects.toMatchObject({
                status: 409,
                existing,
            });
        });

        it('throws 404 when the opponent team does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            await expect(service.create('does-not-exist', { player_name: 'x', bats: 'R' })).rejects.toMatchObject({ status: 404 });
        });
    });

    describe('update', () => {
        const existing = {
            id: 'b-1',
            team_id: 'team-1',
            opponent_team_id: 'opp-1',
            opponent_team_name: 'Johnson HS',
            player_name: 'Old Name',
            normalized_name: 'old name',
            bats: 'R',
            jersey_number: 2,
        };

        it('returns null when the profile does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            await expect(service.update('missing', { player_name: 'x' })).resolves.toBeNull();
        });

        it('updates fields when no collision', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            const updated = { ...existing, player_name: 'New Name', normalized_name: 'new name', bats: 'S', jersey_number: 9 };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as never);

            const result = await service.update('b-1', { player_name: 'New Name', bats: 'S', jersey_number: 9 });
            expect(result).toEqual(updated);
        });

        it('rejects with 409 on rename collision', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'b-other' }] } as never);
            await expect(service.update('b-1', { player_name: 'Other Batter' })).rejects.toMatchObject({ status: 409 });
        });

        it('keeps existing values when params are partial', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);

            await service.update('b-1', { jersey_number: 7 });

            const updateCall = mockQuery.mock.calls[1];
            expect(updateCall[1]).toEqual(['Old Name', 'old name', 'R', 7, 'b-1']);
        });
    });

    describe('delete', () => {
        it('deletes the batter profile', async () => {
            const client = { query: jest.fn().mockResolvedValueOnce({ rowCount: 1 } as never) };
            mockTransaction.mockImplementation(async (cb) => cb(client as never));
            const ok = await service.delete('b-1');
            expect(ok).toBe(true);
            expect(client.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM batter_scouting_profiles'), ['b-1']);
        });

        it('returns false when nothing was deleted', async () => {
            const client = { query: jest.fn().mockResolvedValueOnce({ rowCount: 0 } as never) };
            mockTransaction.mockImplementation(async (cb) => cb(client as never));
            await expect(service.delete('b-1')).resolves.toBe(false);
        });
    });
});
