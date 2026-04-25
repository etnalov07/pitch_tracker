import { PlayerService } from '../player.service';

jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-player-id'),
}));

import { query, transaction } from '../../config/database';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('PlayerService', () => {
    let service: PlayerService;

    beforeEach(() => {
        service = new PlayerService();
        jest.clearAllMocks();
    });

    // =========================================================================
    // importRoster
    // =========================================================================

    describe('importRoster', () => {
        const mockPlayer = {
            id: 'test-player-id',
            team_id: 'team-1',
            first_name: 'Mike',
            last_name: 'Jones',
            jersey_number: 12,
            primary_position: 'SS',
            secondary_position: '2B',
            bats: 'R',
            throws: 'R',
        };

        beforeEach(() => {
            // transaction executes the callback with a mock client
            mockTransaction.mockImplementation(async (cb) => {
                const mockClient = {
                    query: jest.fn().mockResolvedValue({ rows: [mockPlayer] }),
                };
                return cb(mockClient as any);
            });
        });

        it('inserts secondary_position into the players table when provided', async () => {
            const rows = [
                {
                    first_name: 'Mike',
                    last_name: 'Jones',
                    jersey_number: 12,
                    primary_position: 'SS',
                    secondary_position: '2B',
                    bats: 'R',
                    throws: 'R',
                },
            ];

            const result = await service.importRoster('team-1', rows, 'merge');

            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(0);

            // The client.query inside the transaction should have been called with
            // a statement that includes secondary_position
            const txCallback = mockTransaction.mock.calls[0][0];
            const mockClient = { query: jest.fn().mockResolvedValue({ rows: [mockPlayer] }) };
            await txCallback(mockClient as any);

            const insertCall = mockClient.query.mock.calls.find(
                (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO players')
            );
            expect(insertCall).toBeDefined();

            const sql: string = insertCall![0];
            const params: unknown[] = insertCall![1];

            expect(sql).toContain('secondary_position');
            expect(params).toContain('2B');
        });

        it('inserts NULL for secondary_position when not provided', async () => {
            const rows = [
                {
                    first_name: 'Jane',
                    last_name: 'Smith',
                    primary_position: 'CF',
                    bats: 'L',
                    throws: 'R',
                },
            ];

            const txCallback = mockTransaction.mock.calls[0]?.[0];
            const mockClient = { query: jest.fn().mockResolvedValue({ rows: [{ ...mockPlayer, secondary_position: null }] }) };

            // Re-invoke via a fresh transaction mock
            mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient as any));
            await service.importRoster('team-1', rows, 'merge');

            const insertCall = mockClient.query.mock.calls.find(
                (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO players')
            );
            expect(insertCall).toBeDefined();

            const sql: string = insertCall![0];
            const params: unknown[] = insertCall![1];

            expect(sql).toContain('secondary_position');
            expect(params).toContain(null);
        });

        it('reports skipped count when a row fails', async () => {
            mockTransaction.mockImplementationOnce(async (cb) => {
                const mockClient = {
                    query: jest.fn().mockRejectedValue(new Error('duplicate key')),
                };
                return cb(mockClient as any);
            });

            const rows = [{ first_name: 'Bad', last_name: 'Row', primary_position: 'P', bats: 'R', throws: 'R' }];
            const result = await service.importRoster('team-1', rows, 'merge');

            expect(result.imported).toBe(0);
            expect(result.skipped).toBe(1);
            expect(result.errors[0]).toContain('Bad Row');
        });
    });
});
