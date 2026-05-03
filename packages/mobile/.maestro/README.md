# Maestro E2E Suite

End-to-end UI tests for the mobile app. Catches regressions that pre-commit type checks and lint can't see — like the StrikeZone tap-coordinate inversion or the frozen-Redux-state crash on the lineup screen.

## One-time setup

1. **Install Maestro** — https://maestro.mobile.dev/getting-started/installing-maestro
   On Windows, install via Scoop or use WSL. Verify with `maestro --version`.

2. **Create a test user** on the dev API. Don't reuse your own login — test runs may create/delete data.

3. **Configure credentials** — copy `.env.example` to `.env` and fill in:
    ```
    EMAIL=test@example.com
    PASSWORD=your-test-password
    ```
    `.env` is gitignored.

4. **Boot a simulator + Expo Go**
    - iOS: `xcrun simctl boot "iPhone 15"` then open Expo Go (install from App Store inside the simulator).
    - Android: launch an emulator from Android Studio with Expo Go installed.

5. **Start the dev server** in a separate terminal:
    ```bash
    cd packages/mobile && npm start
    ```
    Open the app in Expo Go (scan QR or press `i`/`a` in the Expo CLI).

## Running tests

From `packages/mobile/`:

```bash
npm run e2e:ios          # Expo Go, iOS simulator
npm run e2e:android      # Expo Go, Android emulator
npm run e2e:devclient    # Standalone dev client build (com.bvolante.pitch-tracker)
npm run e2e              # Reads APP_ID from .env, runs whatever you've configured
```

Run a single flow:

```bash
node .maestro/run.js --platform ios .maestro/flows/regression.yaml
```

## Authoring flows

- **Prefer testIDs over text** for taps and assertions. Text-based matchers (`tapOn: "Sign In"`) break the moment a designer reworks copy. testIDs are explicit contracts.
- **Avoid `optional: true`** on assertions you actually want to enforce. An optional assertion that's always missing is a silent-pass, which is exactly how the recent regressions slipped through.
- **One flow per user task**, not per screen. A flow should exercise something a user would do — log in, create a game, log a pitch — not just enumerate every label.
- **Add new regressions to `flows/regression.yaml`** with the commit SHA they guard against, so future you understands why each block exists.

## TestIDs already wired

| Component             | TestID                                  | Used by                                     |
| --------------------- | --------------------------------------- | ------------------------------------------- |
| Login                 | `login-email-input`                     | login.yaml                                  |
| Login                 | `login-password-input`                  | login.yaml                                  |
| Login                 | `login-submit-button`                   | login.yaml                                  |
| Dashboard             | `dashboard-new-game-fab`                | dashboard.yaml, create-game.yaml            |
| New Game wizard       | `new-game-opponent-input`               | create-game.yaml                            |
| New Game wizard       | `new-game-create-button`                | create-game.yaml                            |
| GameHeader            | `batter-selector-open`                  | regression-live-game.yaml                   |
| GameHeader            | `game-header-batter-name`               | regression-live-game.yaml                   |
| GameHeader            | `game-header-pitcher-name`              | regression-live-game.yaml                   |
| BatterSelectorModal   | `batter-selector-modal`                 | regression-live-game.yaml                   |
| BatterSelectorModal   | `batter-selector-substitute-{order}`    | regression-live-game.yaml                   |
| BatterSelectorModal   | `batter-selector-inning`                | regression-live-game.yaml                   |
| BatterSelectorModal   | `batter-selector-save`                  | regression-live-game.yaml                   |
| StrikeZone            | `strike-zone-canvas`                    | regression-live-game.yaml                   |
| InningChangeModal     | `inning-change-modal`                   | (unused — ready for new regression block)   |
| InningChangeModal     | `inning-change-runs-input`              | (unused)                                    |
| InningChangeModal     | `inning-change-confirm`                 | (unused)                                    |

When adding a new flow that targets one of these, prefer `id:` matchers over text — they don't drift when copy changes.

## Pre-push workflow

This is not enforced by a git hook (a simulator may not be running when you push). Treat it as part of the manual pre-commit checklist for any change that touches the mobile UI:

```
1. Rebuild shared (if types changed)
2. npx prettier --write
3. ESLint (web only)
4. npx tsc --noEmit (per package)
5. npm run e2e:ios   <-- mobile UI changes only
6. git commit
```

## Troubleshooting

- **"Element not found"** on a flow that used to pass — first check whether copy or testIDs changed in the touched component. Use `maestro studio` (interactive UI) to inspect the running app's accessibility tree.
- **Login times out** — verify `EMAIL` / `PASSWORD` in `.env` work in the actual app, and that the dev API is reachable.
- **Wrong app launches** — `APP_ID` is wrong for the build you're running. Use `--platform ios|android|devclient` to be explicit.
