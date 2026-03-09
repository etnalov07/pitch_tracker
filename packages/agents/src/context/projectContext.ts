export const PROJECT_CONTEXT = `
# Pitch Tracker — Project Context

You are working on the Pitch Tracker monorepo, a full-stack baseball pitch tracking application.

## Monorepo Structure

\`\`\`
packages/
  shared/   — TypeScript types shared across all packages (must build with \`npm run build\`)
  api/      — Express backend (Node.js, PostgreSQL)
  web/      — React SPA (Create React App, Emotion CSS-in-JS)
  mobile/   — React Native app (Expo Router, React Native Paper, Redux Toolkit)
\`\`\`

## Package: shared

- Single entry point: \`src/index.ts\`
- All shared types, interfaces, and type aliases exported here
- Group types by domain with \`// === Section Name ===\` headers
- MUST run \`npm run build\` after changes (other packages reference compiled output in \`dist/\`)
- Pure TypeScript types — no runtime dependencies

## Package: api (Express Backend)

**Architecture: Routes → Controllers → Services → PostgreSQL**

- **Types:** \`src/types/index.ts\` re-exports all from \`@pitch-tracker/shared\` plus API-only types (\`AuthRequest\`, \`UserWithPassword\`). Import from \`'../types'\` in all API code.
- **Services:** Singleton classes (\`export default new FooService()\`). Use \`query()\` for reads, \`transaction(async (client) => { ... })\` for writes.
- **Controllers:** Thin wrappers. One method per endpoint, call service methods. Pattern:
  \`\`\`typescript
  async methodName(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
      try { ... } catch (error) { next(error); }
  }
  \`\`\`
- **Routes:** Express Router with \`authenticateToken\` middleware on all protected routes. Use \`.bind(controller)\` pattern.
- **Route registration:** \`app.use('/bt-api/<domain>', routes)\` in \`app.ts\`
- **CRITICAL:** Place specific routes (e.g., \`/sessions/team/:teamId\`) BEFORE parameterized routes (\`/sessions/:id\`)
- **Migrations:** Numbered SQL files in \`src/migrations/\` (e.g., \`005_feature_name.sql\`). DB user for GRANT: \`bvolante_pitch_tracker\`

## Package: web (React SPA)

**Architecture: Pages + Components + Services, Emotion styled-components**

- **Component folder structure (3 files):**
  \`\`\`
  ComponentName/
    ComponentName.tsx   — React component (default export)
    styles.ts           — Emotion styled-components using theme tokens
    index.ts            — \`export { default } from './ComponentName';\`
  \`\`\`
- **Barrel exports:** Parent \`index.ts\` files (e.g., \`components/pitcher/index.ts\`)
- **Services:** Named object exports (\`export const fooService = { ... }\`). Use \`api.get<Type>()\`, \`api.post<Type>()\` for type-safe axios calls.
- **Styles:** ALWAYS use \`theme\` object from \`src/styles/theme.ts\`:
  - Colors: \`theme.colors.{primary,gray,green,red,yellow,orange}[50-900]\`
  - Spacing: \`theme.spacing.{xs,sm,md,lg,xl,2xl,3xl}\`
  - Borders: \`theme.borderRadius.{sm,md,lg,xl,2xl,full}\`
  - Shadows: \`theme.shadows.{sm,md,lg,xl}\`
  - Font size: \`theme.fontSize.{xs,sm,base,lg,xl,2xl,3xl,4xl}\`
  - Font weight: \`theme.fontWeight.{normal,medium,semibold,bold}\`
- **Pages:** Local state via \`useState\` + \`useEffect\`, no Redux
- **Modals:** Overlay + Modal with \`onClick={(e) => e.stopPropagation()}\`

## Package: mobile (Expo / React Native)

**Architecture: Expo Router (file-based), Redux Toolkit, React Native Paper**

- **Routing:** File-based in \`app/\` directory. Dynamic routes use \`[id]\` folders.
  - CRITICAL: Cast dynamic route paths as \`any\`: \`router.push('/foo/\${id}/bar' as any)\`
- **State:** Redux Toolkit in \`src/state/\`
  - Slices: \`src/state/<domain>/<domain>Slice.ts\`
  - API clients: \`src/state/<domain>/api/<domain>Api.ts\`
  - Store: \`src/state/store.ts\` (add reducer here)
  - Barrel exports: \`src/state/index.ts\` (export all thunks/actions)
  - Typed hooks: \`useAppDispatch\`, \`useAppSelector\`
- **Components:** \`src/components/<domain>/\` with barrel \`index.ts\`. Use React Native Paper components (\`Text\`, \`Button\`, \`Card\`, \`Chip\`).
- **Styles:** \`StyleSheet.create({})\` at bottom of file
- **FORBIDDEN packages** (crash on iOS 26.2): \`expo-haptics\`, \`expo-secure-store\`, \`expo-sqlite\`, \`expo-network\`
  - Use \`../../utils/haptics\` (no-op wrapper) instead of expo-haptics
  - Use \`AsyncStorage\` instead of expo-secure-store
- **Config:** \`newArchEnabled: false\` in app.json

## Formatting & Linting

### Prettier (ALL packages)
- 4-space indent, 132 print width, single quotes, semicolons, trailing commas (es5)
- Double quotes in JSX, always parens on arrow functions, auto line endings
- Command: \`npx prettier --write "packages/**/*.{ts,tsx}"\`

### ESLint (web package only)
- Import order: builtin > external > internal > parent > sibling > index (alphabetized, no newlines between groups)
- Warnings: no-console (allow warn/error), no-explicit-any, no-unused-vars (prefix with \`_\`), eqeqeq (null exempt)
- Errors: rules-of-hooks, exhaustive-deps

## Pre-Commit Checklist (MANDATORY)
1. \`npx prettier --write\` on ALL changed files
2. \`cd packages/web && npx eslint src/\` — catches import/order, exhaustive-deps, unused vars
3. \`npx tsc --noEmit\` in each changed package
4. If shared types changed: \`cd packages/shared && npm run build\` FIRST

## Git Commit Style
\`\`\`
<type>: <short description>

<optional body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
\`\`\`
Types: feat, fix, style, refactor, docs, chore
`;
