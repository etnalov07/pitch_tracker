import { OpponentPitcherProfileService } from '../opponentPitcherProfile.service';

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

describe('OpponentPitcherProfileService — standalone CRUD (Phase 1.2)', () => {
    let service: OpponentPitcherProfileService;

    beforeEach(() => {
        service = new OpponentPitcherProfileService();
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('inserts a new pitcher profile when no duplicate exists', async () => {
            // 1) opponent team lookup
            mockQuery.mockResolvedValueOnce({ rows: [{ team_id: 'team-1' }] } as never);
            // 2) duplicate name check returns empty
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            // 3) insert
            const inserted = {
                id: 'test-profile-id',
                opponent_team_id: 'opp-1',
                team_id: 'team-1',
                pitcher_name: 'Jake Garcia',
                normalized_name: 'jake garcia',
                throws: 'R',
                jersey_number: 17,
                games_pitched: 0,
            };
            mockQuery.mockResolvedValueOnce({ rows: [inserted] } as never);

            const result = await service.create('opp-1', {
                pitcher_name: 'Jake Garcia',
                throws: 'R',
                jersey_number: 17,
            });

            expect(result).toEqual(inserted);
            expect(mockQuery).toHaveBeenCalledTimes(3);
            const insertCall = mockQuery.mock.calls[2];
            expect(insertCall[0]).toContain('INSERT INTO opponent_pitcher_profiles');
            expect(insertCall[1]).toEqual(['test-profile-id', 'opp-1', 'team-1', 'Jake Garcia', 'jake garcia', 'R', 17]);
        });

        it('throws 409 with existing row when a profile with the same normalized name exists', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ team_id: 'team-1' }] } as never);
            const existing = { id: 'existing-id', pitcher_name: 'Jake Garcia', normalized_name: 'jake garcia' };
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);

            await expect(service.create('opp-1', { pitcher_name: 'Jake  Garcia', throws: 'R' })).rejects.toMatchObject({
                status: 409,
                existing,
            });
        });

        it('throws 404 when the opponent team does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);

            await expect(service.create('does-not-exist', { pitcher_name: 'Jake Garcia', throws: 'R' })).rejects.toMatchObject({
                status: 404,
            });
        });

        it('normalizes whitespace and lowercases when checking duplicates', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ team_id: 'team-1' }] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'test-profile-id' }] } as never);

            await service.create('opp-1', { pitcher_name: '  Jake   Garcia  ', throws: 'L' });

            // duplicate check uses lowercased + collapsed whitespace
            expect(mockQuery.mock.calls[1][1]).toEqual(['opp-1', 'jake garcia']);
            // insert uses trimmed (but not lowercased) display name
            expect(mockQuery.mock.calls[2][1]?.[3]).toBe('Jake   Garcia');
        });
    });

    describe('update', () => {
        const existing = {
            id: 'p-1',
            opponent_team_id: 'opp-1',
            team_id: 'team-1',
            pitcher_name: 'Old Name',
            normalized_name: 'old name',
            throws: 'R',
            jersey_number: 12,
            games_pitched: 3,
        };

        it('returns null when the profile does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            await expect(service.update('does-not-exist', { pitcher_name: 'x' })).resolves.toBeNull();
        });

        it('updates name/throws/jersey when no rename collision', async () => {
            // getById
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);
            // rename collision check (returns empty)
            mockQuery.mockResolvedValueOnce({ rows: [] } as never);
            // update
            const updated = { ...existing, pitcher_name: 'New Name', normalized_name: 'new name', throws: 'L', jersey_number: 22 };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as never);

            const result = await service.update('p-1', { pitcher_name: 'New Name', throws: 'L', jersey_number: 22 });
            expect(result).toEqual(updated);
        });

        it('rejects with 409 if renaming collides with another pitcher on the same opponent team', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p-other' }] } as never);
            await expect(service.update('p-1', { pitcher_name: 'Other Pitcher' })).rejects.toMatchObject({ status: 409 });
        });

        it('keeps existing values when params are partial', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);
            mockQuery.mockResolvedValueOnce({ rows: [existing] } as never);

            await service.update('p-1', { jersey_number: 99 });

            // No rename collision check because normalized_name unchanged
            const updateCall = mockQuery.mock.calls[1];
            expect(updateCall[1]).toEqual(['Old Name', 'old name', 'R', 99, 'p-1']);
        });
    });

    describe('delete', () => {
        it('nullifies opposing_pitchers.profile_id and deletes the profile', async () => {
            const client = {
                query: jest
                    .fn()
                    .mockResolvedValueOnce({ rowCount: 2 } as never)
                    .mockResolvedValueOnce({ rowCount: 1 } as never),
            };
            mockTransaction.mockImplementation(async (cb) => cb(client as never));

            const ok = await service.delete('p-1');
            expect(ok).toBe(true);
            expect(client.query).toHaveBeenNthCalledWith(1, expect.stringContaining('UPDATE opposing_pitchers'), ['p-1']);
            expect(client.query).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE FROM opponent_pitcher_profiles'), [
                'p-1',
            ]);
        });

        it('returns false when nothing was deleted', async () => {
            const client = {
                query: jest
                    .fn()
                    .mockResolvedValueOnce({ rowCount: 0 } as never)
                    .mockResolvedValueOnce({ rowCount: 0 } as never),
            };
            mockTransaction.mockImplementation(async (cb) => cb(client as never));

            await expect(service.delete('p-1')).resolves.toBe(false);
        });
    });
});
