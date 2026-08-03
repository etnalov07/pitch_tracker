/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    // Exclude *.integration.test.ts — those need a real Postgres DB and run via
    // the dedicated `npm run test:integration` (jest.config.integration.js).
    testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '\\.integration\\.test\\.ts$'],
};
