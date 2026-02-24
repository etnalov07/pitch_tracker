# packages/web (React SPA)

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
