/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    // Only run *.integration.test.ts — never the mocked unit tests
    testMatch: ['**/__tests__/**/*.integration.test.ts'],
    testPathIgnorePatterns: ['/node_modules/'],
    // Load .env.test before any module (including app.ts) is imported
    setupFiles: ['<rootDir>/src/__tests__/helpers/loadTestEnv.ts'],
    // Real DB calls need more headroom
    testTimeout: 30000,
    // Sequential — tests within a suite share DB state
    // (--runInBand is passed via the npm script, not here)
};
