# Formatting & Linting

## Prettier (root `.prettierrc`, applies to all packages)

- **Always run `npx prettier --write` on changed files before committing**
- 4-space indent (`tabWidth: 4`)
- Single quotes, semicolons, trailing commas (`es5`)
- Print width: 132
- Double quotes in JSX (`jsxSingleQuote: false`)
- Always use parens for arrow functions (`arrowParens: "always"`)
- Auto line endings (`endOfLine: "auto"`)

## ESLint (web package only, `.eslintrc.js`)

- Extends `react-app` + `plugin:prettier/recommended`
- Import order: builtin > external > internal > parent > sibling > index, alphabetized ascending, no newlines between groups
- `no-console`: warn (allow `warn`, `error`)
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: warn (prefix unused with `_`)
- `eqeqeq`: warn (`null` exempt)
- Hooks: `rules-of-hooks` error, `exhaustive-deps` warn

## Verification Commands

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
