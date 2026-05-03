/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testPathIgnorePatterns: ['/node_modules/'],
    moduleNameMapper: {
        '^@pitch-tracker/shared$': '<rootDir>/../shared/src/index.ts',
    },
};
