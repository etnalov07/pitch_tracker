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
