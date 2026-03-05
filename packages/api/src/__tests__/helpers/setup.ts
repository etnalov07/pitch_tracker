import jwt from 'jsonwebtoken';

// Test JWT secret — must be set before app imports config/env
const TEST_JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.DB_NAME = 'test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.NODE_ENV = 'test';

// Mock database before anything imports it
jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

import request from 'supertest';
import app from '../../app';
import { query, transaction } from '../../config/database';

export const mockQuery = query as jest.MockedFunction<typeof query>;
export const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

export function getAgent() {
    return request(app);
}

export function generateTestToken(userId = 'test-user-id', email = 'test@example.com'): string {
    return jwt.sign({ id: userId, email }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

export function authHeader(token?: string): string {
    return `Bearer ${token || generateTestToken()}`;
}

/**
 * Creates a mock DB client for use inside transaction callbacks.
 * Pass an array of return values for sequential client.query() calls.
 */
export function setupMockTransaction(queryResults: any[]) {
    const mockClient = {
        query: jest.fn(),
    };
    queryResults.forEach((result, i) => {
        mockClient.query.mockResolvedValueOnce(result);
    });
    mockTransaction.mockImplementation(async (cb) => cb(mockClient as any));
    return mockClient;
}

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockTransaction.mockReset();
}
