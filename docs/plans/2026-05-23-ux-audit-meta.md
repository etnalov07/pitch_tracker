# Plan — PitchChart UX Audit (meta-plan)

**Status:** Audit completed · Phase 1 shipped · Phase 2 in progress (see [handoff](2026-05-24-handoff-phase2-continuation.md))
**Audit deliverable:** [`2026-05-23-ux-audit.md`](2026-05-23-ux-audit.md) (127 findings)

> This is the **meta-plan** that drove the UX audit — how the audit was scoped, the heuristics used, and what was in/out of scope. The substantive output (findings table, per-screen sections, Phase 1/2 bundles) is the audit deliverable linked above. Preserved here for reference so the methodology survives if we re-audit later.

## Context

PitchChart works. The functional surface is mature: 20+ mobile routes, 25+ web pages, a working Bluetooth/TTS pitch-calling flow, scouting tendencies just shipped, etc. The user's read is that the **UX, not the feature set, is the next bottleneck** — too many taps, inconsistent patterns, easy to mistap, glanceability could be better.

The `live-game-view-plan_1.md` proposal was discarded — it assumed a codebase that doesn't exist (boolean `onCall` on pitches when calls live in their own table; a `bt_api/pitch.service.js` that doesn't exist; navy/amber rebrand + new font stack; etc.). Starting fresh from current PitchChart reality.

Audit-first: produce a prioritized list of UX findings with severity × effort, **no code changes**, then the user picks what to attack and we write the implementation plan for that subset separately.

---

## Scope

### Phase 1 audit (this plan covers)

The primary in-game and pre-game surfaces — where coaches spend 90% of their seat time:

- **Live Game** — mobile `/game/[id]/live`, web `/game/:gameId`
- **Pitch Calling** — mobile `/game/[id]/pitch-calling` + BT/TTS flow
- **New Game / Setup** — mobile `/game/new`, web `/games/new`
- **Pitcher / Batter switching modals** — Pitcher/Batter/MyBatter/TeamAtBat selector modals
- **In-game scouting & tendencies modals** — HitterTendenciesModal, PitcherTendenciesModal, TendencyZoneGrid, SituationalCallsRow, SuggestedSequence
- **In-play event modals** — InPlay, RunnerEvent, RunnerAdvancement, BaserunnerOut, DoublePlay, Pickoff, InningChange
- **Bullpen Live charting** — mobile `/bullpen/[id]/live`, web `/teams/:team_id/bullpen/:session_id/live`
- **Dashboard / entry point** — mobile `(tabs)/index`, web role-routed dashboard (quick check only — is the path into a game frictionless?)

### Out of scope for Phase 1

Lower-traffic or post-game surfaces — these get a Phase 2 if Phase 1 lands:

- Auth / onboarding (mature, low traffic per user-day)
- Admin panel
- Public report viewer (`/report/:gameId`)
- Team settings, color config, opponent database CRUD
- Bullpen plan creation/editing
- Historical replay / game-history list
- Pitcher profile page (web)
- Performance summary screens
- Email report flow

---

## Method

Code-based heuristic walkthrough. For each in-scope screen, read the component(s), trace the user's tap path through realistic scenarios, and flag issues against the heuristics below.

### General heuristics (Nielsen-adapted)

1. **Visibility of state** — does the user always know what phase they're in, what's pending, what just happened?
2. **Match to real world** — labels & icons use baseball vocabulary, not engineering speak?
3. **User control & freedom** — undo, cancel, back-out always available?
4. **Consistency** — same action looks and behaves the same across screens?
5. **Error prevention** — UI shape prevents wrong taps before they happen?
6. **Recognition over recall** — surfaces info instead of making the coach remember?
7. **Efficiency** — primary action reachable in the minimum taps?
8. **Aesthetic minimalism** — only what's needed *right now* is on screen?
9. **Error recovery** — when something goes wrong, fix path is obvious?
10. **Help & discoverability** — non-obvious affordances are signposted?

### Coaching-app-specific heuristics

11. **Tap count for high-frequency actions** — count taps for the 8 most-common in-game actions (log on-call strike, log off-call ball, switch batter, mark a steal, change pitcher, log foul ball, log HBP, end inning). Anything > 3 taps for a per-pitch action is a finding.
12. **Glanceability** — coach's eyes are on the field 60% of the time; critical info (count, outs, current pitcher, last pitch result) readable in <1 second.
13. **Mistake recovery in real time** — can a fat-finger be fixed within 2 taps without losing context?
14. **Handedness correctness** — LHH/RHH mirroring on strike zone, waste zones, scouting overlays, in-play spray maps.
15. **Web ↔ mobile parity** — both surfaces support the same actions with comparable effort and consistent labels.
16. **One-handed mobile operation** — primary actions reachable with right thumb on a 6.7" phone in landscape (iPad) and portrait (iPhone).
17. **Visual hierarchy under pressure** — primary CTA visually dominant; secondary actions don't compete; modals don't bury the action.
18. **Multi-device sync transparency** — when a call is sent from the catcher tablet to the pitcher device (existing WebSocket relay), is the state of the round-trip visible on both ends?

### Severity scale

- **S0 — Blocking** — prevents core action, causes wrong data, crashes, data loss
- **S1 — Major** — significant friction in a primary flow; common cause of mistakes
- **S2 — Moderate** — friction in a secondary flow; visible inconsistency
- **S3 — Minor** — polish, cosmetic, edge case, "would be nicer"

### Effort scale

- **S (small)** — single component, ≤ ½ day, no migration
- **M (medium)** — multi-file, single package, ½–2 days, no schema change
- **L (large)** — cross-package, schema/migration, design-system work, > 2 days

---

## Deliverable

A single Markdown audit doc: **[`docs/plans/2026-05-23-ux-audit.md`](2026-05-23-ux-audit.md)** with:

1. **Executive summary** — top 5 highest-impact findings (S0/S1 with S/M effort), each one sentence
2. **Findings table** — every finding with columns: `ID | Screen | Heuristic | Description | Severity | Effort | Platform`
3. **Per-screen sections** — for each Phase 1 screen, structured as:
   - Current flow (3–5 bullet trace of the primary tap path)
   - Issues found (referenced back to the table by ID)
   - Concrete suggestions (not prescriptions — discussion fodder)
4. **Phase 1 quick wins** — recommended bundle: 5–8 findings that together would land in one sprint and meaningfully move the needle
5. **Phase 2 investments** — bigger items worth a separate dedicated plan (e.g., design-system tokenization, font stack, sheet library adoption)
6. **Open questions** — things the auditor cannot answer from code alone (animation feel, audio clarity, real-device ergonomics, real-coach pain ranking)

---

## Limitations (what this audit will NOT cover)

These need human review, instrumentation, or in-person observation:

- Visual polish — exact spacing nudges, color contrast feel, font rendering
- Perceived latency / animation timing / 60fps adherence
- Bluetooth audio quality, TTS clarity, A2DP routing reliability on real hardware
- Real-device thumb ergonomics on iPhone & iPad
- Accessibility at the rendered level (screen reader experience, dynamic type)
- Live multi-device sync timing (catcher tablet → pitcher device WebSocket)
- Cold-start time and bundle-size impact of any proposed changes
- Whether the *priorities* assigned match real coach pain — scoring is on principle, not on usage data

**Optional add-on if useful:** if the user shares screenshots of key screens (live game on iPad landscape + iPhone portrait, pitch calling, in-play modals, new-game setup), layer visual findings on top of the code-based ones.

---

## Critical files read during the audit

**Mobile**
- `packages/mobile/app/game/[id]/live.tsx`
- `packages/mobile/app/game/[id]/pitch-calling.tsx`
- `packages/mobile/app/game/new.tsx`
- `packages/mobile/app/bullpen/[id]/live.tsx`
- `packages/mobile/app/(tabs)/index.tsx`
- `packages/mobile/src/components/live/**` (StrikeZone, modals, BaseRunnerDiamond, TendenciesModals, etc.)
- `packages/mobile/src/components/pitchCalling/**`
- `packages/mobile/src/components/batterBreakdown/**`
- `packages/mobile/src/utils/pitchCallAudio.ts`, `walkieTalkie.ts`

**Web**
- `packages/web/src/pages/LiveGame/**`
- `packages/web/src/pages/Bullpen/**` (or wherever bullpen live charting lives)
- `packages/web/src/pages/GameSetup/**` or `Games/New*`
- `packages/web/src/components/live/**`, `web/src/components/modals/**`

**State (to confirm what's possible vs. exposed)**
- `packages/mobile/src/state/pitchCalling/pitchCallingSlice.ts`
- `packages/mobile/src/state/games/**`
- `packages/web/src/services/**` (to confirm parity API coverage)

---

## Process

1. **(this plan approved)**
2. Read the critical files above, screen by screen, in the order listed in Scope.
3. As you go, keep a running findings list in the deliverable doc (`docs/plans/2026-05-23-ux-audit.md`).
4. When the in-scope screens are covered, write the executive summary, fill the findings table, and propose the Phase 1 / Phase 2 bundles.
5. Report back with the doc path and a 5-line summary; user picks which findings to attack.
6. For the chosen findings, write a separate implementation plan (per `/preflight` convention) and ship — small bundled PRs with a `docs/changes/` doc each.

The audit doc itself does NOT trigger any code changes; it's the planning input for the next round.

---

## Verification of the audit

The deliverable is the verification artifact. Acceptance check: the user can read the findings table top-to-bottom and either (a) agree with the severity/effort calls, (b) reprioritize based on coach-pain knowledge the auditor doesn't have, or (c) reject specific findings as non-issues. Disagreements get noted in the doc as "deferred — user input" and don't block Phase 1 selection.

---

## Out of scope (deferred — explicit)

- Any code changes during the audit
- Re-litigating the `live-game-view-plan_1.md` doc; its UX *ideas* (call-prefill, off-call signal, last-pitch undo/edit) will show up as candidate findings if the audit independently agrees they're high-impact, not because the doc said so
- Design-system rebrand (Oswald + Source Sans + JetBrains Mono, navy + amber tokens) — if it emerges as a real finding it goes in Phase 2 as its own investment
- Phase 2 secondary-surface audit (history, profile, settings, admin, plans, replay) — only happens if Phase 1 lands cleanly

---

## Outcome (as of 2026-05-25)

- Audit deliverable: 127 findings in [`2026-05-23-ux-audit.md`](2026-05-23-ux-audit.md).
- **Phase 1 shipped** (commit `9b2a8fd`): snackbar foundation, Fix Last Pitch, escape modals, pitch count, date pickers, zone-tap UX, home/away recovery.
- **Phase 2 batch 1 shipped** (commit `66bfe29`): design tokens (item A) + heat-zone strip (item K).
- **Phase 2 item C shipped** across 5 commits (`bd449a1`, `35571a4`, `1bce870`, `ce80e01`, `067e9e9`): live.tsx 2921 → 115 lines (-96%) via controller hook + actions hook + modals + layout components + render helpers + shared styles.
- **Phase 2 item H** (navy/amber aesthetic): **declined** by user — neutral palette stays.
- **Phase 2 items B, D, E, F, G, I, J**: remaining. See [handoff](2026-05-24-handoff-phase2-continuation.md) for the recommended attack order.
