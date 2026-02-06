# Pitch Tracker - Development Spec

## Project Structure

Monorepo with 4 packages:

```
packages/
  shared/   - TypeScript types shared across all packages (build with `npm run build`)
  api/      - Express backend (Node, PostgreSQL)
  web/      - React SPA (CRA, Emotion CSS-in-JS)
  mobile/   - React Native (Expo Router, React Native Paper)
```

## Formatting & Linting

### Prettier (root `.prettierrc`, applies to all packages)

- **Always run `npx prettier --write` on changed files before committing**
- 4-space indent (`tabWidth: 4`)
- Single quotes, semicolons, trailing commas (`es5`)
- Print width: 132
- Double quotes in JSX (`jsxSingleQuote: false`)
- Always use parens for arrow functions (`arrowParens: "always"`)
- Auto line endings (`endOfLine: "auto"`)

### ESLint (web package only, `.eslintrc.js`)

- Extends `react-app` + `plugin:prettier/recommended`
- Import order: builtin > external > internal > parent > sibling > index, alphabetized ascending, no newlines between groups
- `no-console`: warn (allow `warn`, `error`)
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: warn (prefix unused with `_`)
- `eqeqeq`: warn (`null` exempt)
- Hooks: `rules-of-hooks` error, `exhaustive-deps` warn

### Verification Commands

```bash
# Format all changed files
npx prettier --write "packages/**/*.{ts,tsx}"

# Check web eslint
cd packages/web && npx eslint src/

# TypeScript (rebuild shared first if types changed)
cd packages/shared && npm run build
cd packages/api && npx tsc --noEmit
cd packages/web && npx tsc --noEmit
cd packages/mobile && npx tsc --noEmit
```

## Package-Specific Patterns

### `packages/shared`

- Single entry point: `src/index.ts`
- All shared types, interfaces, and type aliases exported here
- Must run `npm run build` after changes (other packages reference the compiled output)
- Group types by domain with `// ===` section headers

### `packages/api` (Express Backend)

**Architecture**: Routes → Controllers → Services → PostgreSQL

- **Types**: `src/types/index.ts` re-exports all from `@pitch-tracker/shared` plus API-only types (`AuthRequest`, `UserWithPassword`)
- **Services**: Singleton classes (`export default new FooService()`), import types from `'../types'`
- **Controllers**: Thin wrappers, one method per endpoint, call service methods
- **Routes**: Express Router, `authenticate` middleware on all routes, `.bind(controller)` pattern
- **Migrations**: Numbered SQL files in `src/migrations/` (e.g., `005_bullpen_mode.sql`)
- **DB**: Use `query()` for reads, `transaction(async (client) => { ... })` for writes
- **Route registration**: `app.use('/bt-api/<domain>', routes)` in `app.ts`
- Place specific routes (e.g., `/sessions/team/:teamId`) before parameterized routes (`/sessions/:id`) to avoid conflicts

### `packages/web` (React SPA)

**Architecture**: Pages + Components + Services, Emotion styled-components

- **Services**: Named object exports (`export const fooService = { ... }`)
  - Use `api.get<Type>()` / `api.post<Type>()` for type-safe axios calls
  - Base API instance in `services/api.ts` (auth interceptor adds Bearer token from localStorage)
- **Components**: Folder per component with 3 files:
  ```
  ComponentName/
    ComponentName.tsx   - React component (default export)
    styles.ts           - Emotion styled-components
    index.ts            - `export { default } from './ComponentName';`
  ```
  - Barrel exports in parent `index.ts` (e.g., `components/pitcher/index.ts`)
- **Styles**: Use `theme` object from `src/styles/theme.ts` for all design tokens
  - Colors: `theme.colors.{primary,gray,green,red,yellow,orange}[50-900]`
  - Spacing: `theme.spacing.{xs,sm,md,lg,xl,2xl,3xl}`
  - Borders: `theme.borderRadius.{sm,md,lg,xl,2xl,full}`
  - Shadows: `theme.shadows.{sm,md,lg,xl}`
  - Font size: `theme.fontSize.{xs,sm,base,lg,xl,2xl,3xl,4xl}`
  - Font weight: `theme.fontWeight.{normal,medium,semibold,bold}`
- **Pages**: Local state via `useState` + `useEffect`, no Redux
- **Modals**: Overlay + Modal pattern with `onClick={(e) => e.stopPropagation()}`

### `packages/mobile` (Expo / React Native)

**Architecture**: Expo Router (file-based), Redux Toolkit, React Native Paper

- **Routing**: File-based in `app/` directory. Dynamic routes use `[id]` folders
  - Cast dynamic route paths as `any` to avoid Expo typed routes errors: `router.push('/foo/${id}/bar' as any)`
- **State**: Redux Toolkit in `src/state/`
  - Slices: `src/state/<domain>/<domain>Slice.ts`
  - API clients: `src/state/<domain>/api/<domain>Api.ts`
  - Store: `src/state/store.ts` (add reducer here)
  - Barrel exports: `src/state/index.ts` (export all thunks/actions here)
  - Typed hooks: `useAppDispatch`, `useAppSelector`
- **Components**: `src/components/<domain>/` with barrel `index.ts`
  - Use React Native Paper components (`Text`, `Button`, `Card`, `Chip`, etc.)
  - Styles via `StyleSheet.create({})` at bottom of file
- **Haptics**: Use `import * as Haptics from '../../utils/haptics'` (no-op wrapper, NOT `expo-haptics`)
- **Auth tokens**: Use `AsyncStorage` (NOT `expo-secure-store`)
- **New Architecture**: Disabled (`newArchEnabled: false` in `app.json`) due to iOS 26.2 beta TurboModule crash

## Commit Style

```
<type>: <short description>

<optional body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`

## Common Pitfalls

- Always rebuild `packages/shared` (`npm run build`) after modifying shared types before checking other packages
- Expo Router typed routes reject dynamic paths — always cast as `any`
- The API `types/index.ts` re-exports from `@pitch-tracker/shared` via `export *`, so all shared types are available through `'../types'`
- Do NOT use `expo-haptics`, `expo-secure-store`, `expo-sqlite`, or `expo-network` — these crash on iOS 26.2 beta
- Run `npx prettier --write` on all new/changed files before committing
- The DB user for GRANT statements is `bvolante_pitch_tracker`
