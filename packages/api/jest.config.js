/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/'],
};
