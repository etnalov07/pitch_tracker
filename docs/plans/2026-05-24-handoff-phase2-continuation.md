# Handoff — Phase 2 continuation (post C-cont 3b)

**Date:** 2026-05-24
**Owner of next session:** the model that opens this file
**Previous session's final commits:** `ce80e01` (3a), `067e9e9` (3b), `68d1ae0` (doc backfill) — all on `main`, pushed.

---

## Where we are

The UX audit (`docs/plans/2026-05-23-ux-audit.md`) shipped Phase 1 across 4 batches and is on Phase 2.

**Phase 2 items already done:**

| Item | Title | Status |
|---|---|---|
| A | Design token consolidation | Shipped (`66bfe29`) |
| K | Heat-zone parity (strip from web, NOT lift to mobile — user decision) | Shipped (`66bfe29`) |
| C | Live screen refactor — `live.tsx` 2921 → 115 lines (-96%) across 4 commits | **Just finished**: `bd449a1` (phone reorder), `35571a4` (controller hook), `1bce870` (modals + topbar), `ce80e01` (actions hook), `067e9e9` (layouts + helpers + styles) |
| H | Scoreboard aesthetic (navy/amber/Oswald) | **Explicitly declined.** User chose to stay on the neutral palette. Do not re-litigate. |

**Phase 2 items remaining** (7 items, in the audit's labeled order — not strict priority):

| Item | Title | Notes |
|---|---|---|
| B | **Pitch calling consolidation** | Two parallel flows (`/live` inline + dedicated `/pitch-calling`) maintain duplicate state, components, behavior. Pick one canonical impl, deprecate the other. Adds `pitch_calls.pitch_id` FK + 6-bucket call result enum. **Cross-cuts API + DB + web + mobile.** Largest remaining item. Audit findings: `UX-PC-01`, `-02`, `-04`, `-05`, `-07`, `-08`, `-09`. |
| D | **New Game flow alignment** | Pick mobile-form vs web-wizard paradigm. Add edit-in-place on web confirm. Findings: `UX-NG-01`, `-04`, `-11`, `-12`, `-13`. |
| E | **In-play modal cleanup** | Standardize modal scaffolding (Paper Portal everywhere); replace `View+onTouchEnd` with `Pressable` in InPlayModal; split RunnerEventModal into Advance/Out; trim `RunnerAdvancementModal.tsx` (592 lines). Findings: `UX-IP-02`, `-03`, `-04`, `-07`, `-08`, `-09`, `-15`. |
| F | **Tendencies side-by-side mode (tablet)** | On iPad landscape, render Tendencies panel beside the strike zone instead of opening a blocking modal. Lifts the biggest in-game glanceability finding. Findings: `UX-TD-10`, `-11`, `UX-LG-11`. |
| G | **Snackbar / Toast library evaluation** | Phase 1 shipped a hand-rolled toast (commit `9b2a8fd`). Phase 2 evaluates `react-native-paper-toast` or wrapping RNP's `Snackbar`. May result in "keep what we have" — low-risk eval. |
| I | **Bullpen feature parity** | Mobile plan editor; Undo last pitch; truthful display for unscored pitches; verify Command Grade integration. Findings: `UX-BP-02`, `-10`, `-13`, `-14`. |
| J | **Mobile role routing** | Player-role mobile users see a coach-shaped dashboard. Mirror web's `RoleRouter`. Finding: `UX-DB-10`. |

---

## How to attack it

### Sequence (recommended)

Order is **risk-adjusted**, not strict-dependency. Lower-risk and higher-leverage first so each batch ships independently:

1. **G — Snackbar library eval** (~1 hour, 1 commit, low risk). Quick spike: try `react-native-paper-toast`. If it cleanly replaces our hand-rolled toast and ConfirmDialog, swap; otherwise document "stay with hand-rolled" and close the item. Best first task because it's small, scoped, and verifies the next session's workflow.

2. **J — Mobile role routing** (~half day, 1 commit, low risk). Mirror web's `RoleRouter`. Mobile-only; the routing logic lives in `app/(tabs)/index.tsx` and a couple of redirects. Self-contained, no API or schema changes.

3. **E — In-play modal cleanup** (~1 day, 2-3 commits). Multi-modal sweep but each modal is independent. Start with the `View+onTouchEnd → Pressable` swap (smallest), then split RunnerEventModal, then tackle RunnerAdvancementModal trim last. Each modal is its own commit.

4. **F — Tendencies side-by-side (tablet)** (~1 day, 1-2 commits). Layout change scoped to iPad landscape. Reuses the `useLiveGameController` pattern we just built — the layout component (`LiveGameTablet.tsx`) is the file that changes. **Risk:** sizing/responsive breakpoints. Verify on the iPad Pro 13" simulator.

5. **I — Bullpen feature parity** (~1-2 days, 2-3 commits). Mobile plan editor is the biggest sub-item (it's a new screen). Undo + display fixes are quick wins; ship them first as one commit, then plan editor as a separate batch.

6. **D — New Game flow alignment** (~1-2 days, 2 commits). Has an explicit prerequisite decision: **mobile form vs web wizard** — surface that question to the user before coding. Phase 1 smart-defaults already shipped, so this is the redesign half.

7. **B — Pitch calling consolidation** (LAST — ~3-5 days, multiple commits, cross-package). The biggest remaining item. Cross-cuts API + DB + web + mobile. Save for last because:
   - Needs DB migration (`pitch_calls.pitch_id` FK + result enum) — review with user before writing.
   - Pick-a-canonical-impl decision should happen with the user, not on the model's own.
   - Will benefit from everything else being done first (less concurrent churn).

### Workflow per item

Follow the rhythm we used through C-cont 3:

1. **Read the audit findings** in `docs/plans/2026-05-23-ux-audit.md` for the item's `UX-XX-NN` codes. Treat the audit as the spec.
2. **Write a plan** at `docs/plans/2026-05-24-phase2-<letter>-<slug>.md` (one per item). Include: Context, Plan (Decisions), Scope (files touched, grouped by package), Verification, Out of scope. Surface user-input questions before coding.
3. **Implement in small batches**, each its own commit. Don't bundle multiple Phase 2 items into one commit.
4. **`/check`** before each commit: prettier + eslint (web only) + tsc per affected package + jest (mobile).
5. **Version bump** the affected package(s) per commit. **Never** bump `packages/shared` (api/web pin it at 1.0.0). Mobile is at **2.17.0** as of this handoff.
6. **Change doc** at `docs/changes/2026-05-24-phase2-<letter>-<slug>.md` paired with each commit. Backfill the commit SHA after pushing. Update both `docs/plans/README.md` and `docs/changes/README.md` index tables.
7. **Push** after each commit (we've been shipping straight to `main`; no PR flow in use).
8. **`/parity-check`** after any UI change to confirm web ↔ mobile match (sizing, positioning, label logic, LHH/RHH mirroring).

### Constraints to remember (from memory + CLAUDE.md)

- **Persona:** Seinfeld references in commits + chat. Bad code is "a festivus grievance"; gold work is "gold, Jerry, gold". Don't force it where it doesn't fit.
- **api can't runtime-import @pitch-tracker/shared** — only type-only imports. Prod ships api dist standalone; runtime values must be duplicated locally.
- **Don't touch `packages/shared` version** (pinned at exact 1.0.0; bumping 404s CI npm ci).
- **Rebuild shared first** after editing `packages/shared/src/`: `cd packages/shared && npm run build` — downstream packages resolve against `dist/`, not `src/`.
- **iOS 26.2 beta:** do NOT use `expo-haptics`, `expo-secure-store`, `expo-sqlite`, `expo-network`. Phase 2 G (Snackbar lib) needs to verify compat.
- **Game deletion gaps** belong on the `user-levels` branch (Super User plan), NOT `main`. Don't add DELETE /games/:id or fix the mobile deleteGame import in this Phase 2 work.
- **Prettier:** 4-space indent, single quotes, semicolons, trailing commas (es5), print width 132, always parens on arrow functions.

### Session-1 budget

For the next session, aim to finish **G + J** (small wins to start) and ideally make a dent in **E**. Stop and bank progress rather than push into B/D until the user is in a position to weigh in on the prerequisite decisions (mobile-form vs web-wizard for D; DB migration scope for B).

---

## Key references for the next session

- **The audit (authoritative spec):** `docs/plans/2026-05-23-ux-audit.md`
- **C-cont final structure (model for future refactors):** `packages/mobile/app/game/[id]/` — see `live.tsx` (orchestrator), `useLiveGameController.ts`, `useLiveGameActions.ts`, `LiveGameTablet.tsx`, `LiveGamePhone.tsx`, `LiveGameRenderHelpers.tsx`, `liveGameStyles.ts`, `LiveGameModals.tsx`, `LiveGameTopBar.tsx`.
- **Web equivalent pattern (existing, used as template for mobile split):** `packages/web/src/pages/LiveGame/` — `useLiveGameState.ts` + `useLiveGameActions.ts`.
- **Phase 1 + Phase 2 batch 1 + C-cont 3 change docs:** `docs/changes/2026-05-23-*.md`
- **Memory:** `C:\Users\brian\.claude\projects\C--Projects-pitch-tracker\memory\MEMORY.md` — pre-loaded into every conversation; respect what's in there.

---

## What is the DEAL with this handoff

Read this file first, then `docs/plans/2026-05-23-ux-audit.md` for the item you're tackling. Pick G or J to start (small + self-contained). Confirm with the user before starting B or D — both have prerequisite decisions the model shouldn't make alone.

No hugging, no learning, no re-litigating decisions already made. Heat zones are stripped on web (not lifted to mobile). Palette is neutral (not navy/amber). live.tsx is sacred ground — don't go back in.
