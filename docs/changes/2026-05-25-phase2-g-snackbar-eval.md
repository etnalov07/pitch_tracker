# Phase 2 G — Snackbar / Toast library eval · 2026-05-25

**Type:** `docs` + minor `feat` (accessibility QoL)
**Commit:** _(pending)_
**Versions:** `mobile@2.22.0 → 2.22.1`

## Context

Phase 2 item G of the UX audit was an explicit re-evaluation of the Phase 1 hand-rolled toast — should we adopt a third-party library now that we have the system in hand? Per the handoff, "may result in keep what we have."

Full eval rationale: [`docs/plans/2026-05-25-phase2-g-snackbar-eval.md`](../plans/2026-05-25-phase2-g-snackbar-eval.md).

## Decision

**Keep the hand-rolled toast** (~170 lines total across web + mobile).

The valuable property of what we have is that **the API is identical on web and mobile** — `useToast().show({ message, type, action, duration })` — and Phase 1 already migrated 53 `Alert.alert` / `alert()` callsites to it. Third-party libs (`react-native-paper-toast`, `react-hot-toast`, `sonner`) are platform-specific and would force us to either pick one platform's UX and reimplement the other, or maintain two divergent APIs. Neither is worth the win.

Other factors:
- ~170 lines is small enough to maintain without tracking an external lib's release cadence.
- iOS 26.2 beta surface argues for fewer deps, not more.
- Just de-risked by the Portal.Host placement fix (`4a5a92c`, mobile 2.18.4) — current state is proven.

## What shipped

### packages/mobile (v2.22.1)

- **`src/hooks/useToast.tsx`** — wrap the Snackbar in a `<View accessibilityLiveRegion="polite" pointerEvents="box-none">` so VoiceOver / TalkBack announce toast contents as they appear. Matches the web `ToastView`'s existing `role="status" aria-live="polite"`. One-line behavior change for screen-reader users; zero change for sighted users.

### packages/web

No code changes — `ToastView` already had the equivalent ARIA props.

### docs/plans + docs/changes

- New plan + change doc capturing the eval.
- Update `docs/plans/README.md` + `docs/changes/README.md` indexes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Manual (when on device): enable VoiceOver, trigger any toast (e.g. tap "Undo" with no pitches logged) — VO announces the message text.

## Out of scope (deferred)

- Multi-toast queue — latest-wins works; defer until a real complaint surfaces.
- Top-vs-bottom position config — defer; bottom is fine on both platforms.
- Promise-based `show()` (resolve on action / dismiss) — defer.
- Web toast responsive positioning — defer.
- Bumping `packages/shared`'s version (per memory: never bump shared).

## Phase 2 status after this batch

| Item | Title | Status |
|---|---|---|
| A | Design tokens | Shipped |
| B | Pitch calling consolidation | Pending (biggest) |
| C | Live screen refactor | Shipped |
| D | New Game flow alignment | Pending (needs user input) |
| E | In-play modal cleanup | Pending |
| F | Tendencies side-by-side (tablet) | Pending |
| **G** | **Snackbar lib eval** | **Closed — keep hand-rolled** |
| H | Scoreboard aesthetic | Declined |
| I | Bullpen feature parity | Pending |
| J | Mobile role routing | Pending |
| K | Heat-zone parity | Shipped |
