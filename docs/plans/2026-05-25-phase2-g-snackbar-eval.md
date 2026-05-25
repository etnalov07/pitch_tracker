# Plan — Phase 2 G: Snackbar / Toast library evaluation

**Status:** Decided · Keep hand-rolled
**Phase:** UX Audit Phase 2 — Item G
**Findings addressed:** `UX-GLB-02` (foundation underpinning Phase 1's hand-rolled toast)
**Change doc:** [`docs/changes/2026-05-25-phase2-g-snackbar-eval.md`](../changes/2026-05-25-phase2-g-snackbar-eval.md)

## Context

Phase 1 shipped a hand-rolled `useToast` / `ToastProvider` on both web and mobile (commit `9b2a8fd`, "Snackbar foundation"). Phase 2 item G is the explicit re-evaluation: should we swap to a third-party library (`react-native-paper-toast`, etc.) now that we have it in hand?

Per the audit, this was always a low-risk eval that "may result in keep what we have."

## Evaluation

### What we have today

| Feature | Mobile (`packages/mobile/src/hooks/useToast.tsx`) | Web (`packages/web/src/hooks/useToast.tsx`) |
|---|---|---|
| Lines of code | 101 | 73 (+ ToastView component ~38) |
| Types | `'info' \| 'error' \| 'success'` | same |
| Action button | yes | yes |
| Custom duration | yes (default 3000ms / 5000ms with action) | yes (default 3500ms / 5000ms with action) |
| Theme integration | Paper theme tokens | CSS variables via Emotion |
| Queue | no (latest wins) | no (latest wins) |
| API | `useToast().show({ message, type, action, duration })` + `.hide()` | identical |
| Provider gate | throws "must be used within a ToastProvider" if missing | same |

Both platforms share the **exact same API surface**. Phase 1 callers (snackbar, fix-last-pitch, escape modals, etc.) use the unified `show()` shape.

### Third-party options surveyed

- **`react-native-paper-toast`** — Thin wrapper around Paper's `<Snackbar>` (which we already use directly on mobile). README acknowledges it's mostly sugar. Mobile-only.
- **`react-hot-toast`** — Web-only, heavy on animations + design opinions that don't match our Paper / Emotion stack.
- **`sonner`** — Web-only, modern; but adopting it would diverge from mobile and require its own provider.

None of them give us a **single unified API across web + mobile**, which is the most valuable property of what we have today.

### Decision: keep hand-rolled

Reasons:
1. **~170 lines total** — small enough to maintain without an external dep's release cadence to track.
2. **Unified web + mobile API** — third-party libs are platform-specific; adopting any would break call-site symmetry.
3. **iOS 26.2 beta surface area** — fewer deps = fewer compat surprises (per memory: `expo-haptics`/`-secure-store`/`-sqlite`/`-network` already banned in this beta).
4. **Recently de-risked** — the Portal.Host placement fix (`4a5a92c`, mobile 2.18.4) makes the current path proven.
5. **No user pain reported** — the `latest wins` (no queue) behavior hasn't bitten anyone since Phase 1 shipped two days ago.

### QoL improvement found during the eval (shipped)

- **Mobile screen-reader announcement**: wrap the mobile Snackbar in a `<View accessibilityLiveRegion="polite">` so VoiceOver / TalkBack announce toast contents as they appear. Web already had the equivalent (`role="status" aria-live="polite"`) on `ToastView`. One-line fix; no behavior change for sighted users.

## Scope

### packages/mobile (v2.22.0 → v2.22.1)

- `src/hooks/useToast.tsx`: wrap Snackbar in a `<View accessibilityLiveRegion="polite" pointerEvents="box-none">` for screen-reader parity with web.

### docs

- This plan + the change doc capturing the decision.

## Verification

- `cd packages/mobile && npx tsc --noEmit` clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Manual: with VoiceOver on iOS, trigger any toast (e.g. tap "Undo" with no pitches logged) — VO announces the message text.

## Out of scope (deferred — close item G)

- **Multi-toast queue** — defer until a real complaint surfaces; latest-wins works.
- **Top-vs-bottom position config** — defer; bottom on both platforms is fine.
- **Promise-based `show()`** (resolve on action / dismiss) — defer until a caller needs it.
- **Web toast position responsiveness** — defer.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
