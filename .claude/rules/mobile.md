# packages/mobile (Expo / React Native)

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
