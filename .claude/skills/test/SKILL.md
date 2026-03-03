---
name: test
description: Generate unit or integration tests for any file in the monorepo. Sets up test infrastructure per-package if needed.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx prettier *), Bash(npx jest *), Bash(npm install *), Bash(npm test *), Bash(npx tsc *), Bash(ls *), Bash(mkdir *), Bash(cat *)
argument-hint: <file-path> [--integration]
---

# Test Generator Skill

Generate tests for any source file in the pitch-tracker monorepo.

**Read `.claude/skills/test/patterns.md` before generating any test file.** It contains package-specific patterns, mock strategies, and examples you MUST follow.

## Invocation

`/test <file-path> [--integration]`

- `<file-path>`: Full path, partial path, or component/service name
- `--integration`: Generate integration tests (e.g., supertest for API routes)

## Step-by-Step Procedure

### 1. Resolve the Target File

If `$ARGUMENTS` is a full path, use it directly. If partial, use Glob to find the file:

- Try `packages/**/$ARGUMENTS` then `packages/**/$ARGUMENTS.*` then `packages/**/$ARGUMENTS/*.tsx`
- If multiple matches, ask the user which file they mean.
- If no match, tell the user the file was not found.

### 2. Detect Package

Determine the package from the resolved path:

- `packages/api/` → **api**
- `packages/web/` → **web**
- `packages/mobile/` → **mobile**
- `packages/shared/` → **shared**

### 3. Check & Set Up Test Infrastructure

Check if the package already has test infrastructure. If not, set it up:

#### API (`packages/api/`)

Check: Does `packages/api/jest.config.ts` exist?

If NOT, create it and install deps:

```bash
cd packages/api && npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

Create `packages/api/jest.config.ts`:

```ts
import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    clearMocks: true,
};

export default config;
```

Add to `packages/api/package.json` scripts: `"test": "jest"`

#### Mobile (`packages/mobile/`)

Check: Does `packages/mobile/jest.config.ts` or jest config in `package.json` exist?

If NOT, install deps:

```bash
cd packages/mobile && npm install --save-dev @testing-library/react-native @testing-library/jest-native @types/jest
```

The mobile package uses `jest-expo` preset (already available via Expo). Add jest config to `packages/mobile/package.json`:

```json
"jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-paper)"
    ],
    "setupFilesAfterSetup": ["@testing-library/jest-native/extend-expect"]
}
```

Add to scripts: `"test": "jest"`

#### Shared (`packages/shared/`)

Check: Does `packages/shared/jest.config.ts` exist?

If NOT:

```bash
cd packages/shared && npm install --save-dev jest ts-jest @types/jest
```

Create `packages/shared/jest.config.ts`:

```ts
import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    clearMocks: true,
};

export default config;
```

Add to scripts: `"test": "jest"`

#### Web (`packages/web/`)

Already set up via CRA. No action needed.

### 4. Read the Source File

Read the target file completely. Also read its key imports (types, services it depends on) to understand:

- What functions/methods/components are exported
- What dependencies need to be mocked
- What types are used for inputs/outputs

### 5. Determine Test File Location and Extension

- Test directory: Create a `__tests__/` folder as a sibling of the source file
- File name: `<source-name>.test.ts` or `<source-name>.test.tsx`
- Use `.tsx` if the source file contains JSX or is a React component
- Use `.ts` for everything else (services, utilities, types)

Example: `packages/api/src/services/game.service.ts` → `packages/api/src/services/__tests__/game.service.test.ts`

### 6. Generate the Test File

Follow the patterns in `patterns.md` for the detected package. Key rules:

- **Arrange-Act-Assert** pattern in every `it()` block
- **`describe` block** per exported function/method/component
- **Minimum coverage**: 1 happy path + 1 error/edge case per public method
- **Mock external deps**: DB, HTTP, platform APIs — NEVER call real services
- **4-space indent**, single quotes, trailing commas (prettier config)
- **No `any` types** where avoidable — use proper typing for mocks
- Import from relative paths matching how the source file imports

### 7. Format with Prettier

```bash
npx prettier --write <test-file-path>
```

### 8. Run the Tests

```bash
cd packages/<package> && npx jest --testPathPattern="<test-file-name>" --no-coverage
```

- If tests **pass**: Report success with summary
- If tests **fail**: Read the error output, fix the test file, and re-run (up to 3 attempts)
- Common fixes: incorrect mock shape, wrong import path, missing mock setup

## Important Notes

- Do NOT generate tests for type-only files (interfaces, type aliases with no runtime code)
- For `--integration` flag on API routes, use supertest instead of mocking req/res
- When mocking services that are singleton default exports, use `jest.mock('../path')` with factory
- For web components that use React Router, wrap renders in `<MemoryRouter>`
- For web components that use context/providers, include necessary provider wrappers
- Always check if a `__tests__` directory already exists — if the test file exists, ask the user if they want to overwrite or update it
