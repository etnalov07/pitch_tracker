# Feature Plans

| Date       | Feature                                                        | Status      | Plan                                                                                  |
| ---------- | -------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| 2026-03-06 | Video Analysis & Camera Setup                                  | Approved    | [video-analysis-camera-setup](video-analysis-camera-setup.md)                         |
| 2026-03-21 | Pitch Calling & Walkie-Talkie Spec                             | Approved    | [pitchchart-pitch-calling-spec](pitchchart-pitch-calling-spec.md)                     |
| 2026-03-22 | Walkie-Talkie, BT Status & Analytics                           | Planned     | [pitchchart-walkie-talkie-implementation](pitchchart-walkie-talkie-implementation.md) |
| 2026-04-05 | Tendencies Buttons & Situational Call Types                    | Planned     | [tendencies-buttons-situational-calls](tendencies-buttons-situational-calls.md)       |
| 2026-04-20 | Opposing Pitcher Charting, Multi-Device Sync, Count Breakdowns | Planned     | [pitchchart-new-features](pitchchart-new-features.md)                                 |
| 2026-05-10 | Super User + Three Signup Modes (Coach / Player / Org Admin)   | Approved    | [super-user-and-signup-modes](2026-05-10-super-user-and-signup-modes.md)              |
| 2026-05-11 | Zone-based pitch accuracy scoring                              | Approved    | [zone-based-accuracy](2026-05-11-zone-based-accuracy.md)                              |
| 2026-05-12 | Command Grade softening — row floor on column-anchored targets | Approved    | [command-grade-softening](2026-05-12-command-grade-softening.md)                      |
| 2026-05-12 | Command Grade six-level scoring (Dial 2)                       | Not adopted | [command-grade-six-level](2026-05-12-command-grade-six-level.md)                      |
| 2026-05-12 | Standalone opponent roster (add pitchers & batters w/o a game) | Approved    | [standalone-opponent-roster](2026-05-12-standalone-opponent-roster.md)                |
| 2026-05-12 | Command / pitch accuracy audit (3 paths, 4 proposals tested)   | Review only | [command-grade-audit](2026-05-12-command-grade-audit.md)                              |
| 2026-05-23 | UX audit — meta-plan (heuristics, scope, process)              | Completed   | [ux-audit-meta](2026-05-23-ux-audit-meta.md)                                          |
| 2026-05-23 | UX audit — primary in-game surfaces (127 findings)             | Review only | [ux-audit](2026-05-23-ux-audit.md)                                                    |
| 2026-05-23 | Snackbar foundation — replace Alert.alert / alert()            | Approved    | [snackbar-foundation](2026-05-23-snackbar-foundation.md)                              |
| 2026-05-23 | Phase 1 quick wins batch 2 (escape modals, pitch count, etc.)  | Approved    | [phase1-quickwins-batch](2026-05-23-phase1-quickwins-batch.md)                        |
| 2026-05-23 | Fix Last Pitch — result-only PATCH + snackbar Edit action      | Approved    | [fix-last-pitch](2026-05-23-fix-last-pitch.md)                                        |
| 2026-05-23 | Phase 1 quick wins batch 3 (date pickers, zone-tap UX, home/away recovery) | Approved | [phase1-batch3](2026-05-23-phase1-batch3.md)                                          |
| 2026-05-23 | Phase 2 batch 1 — design tokens (A) + heat-zone strip (K)      | Approved    | [phase2-tokens-and-heatzone-strip](2026-05-23-phase2-tokens-and-heatzone-strip.md)    |
| 2026-05-23 | Phase 2 — C (partial) — phone layout reorder for thumb zone    | Approved    | [phase2-c-partial-phone-reorder](2026-05-23-phase2-c-partial-phone-reorder.md)        |
| 2026-05-23 | Phase 2 — C cont 1 — extract useLiveGameController hook        | Approved    | [phase2-c-cont-hook-extraction](2026-05-23-phase2-c-cont-hook-extraction.md)          |
| 2026-05-23 | Phase 2 — C cont 2 — extract LiveGameModals + LiveGameTopBar   | Approved    | [phase2-c-cont-jsx-split](2026-05-23-phase2-c-cont-jsx-split.md)                      |
| 2026-05-23 | Phase 2 — C cont 3a — extract useLiveGameActions hook          | Approved    | [phase2-c-cont-3a-actions-hook](2026-05-23-phase2-c-cont-3a-actions-hook.md)          |
| 2026-05-23 | Phase 2 — C cont 3b — extract LiveGameTablet/Phone + helpers   | Approved    | [phase2-c-cont-3b-layout-components](2026-05-23-phase2-c-cont-3b-layout-components.md) |
| 2026-05-25 | Scrimmage game mode (no auto-3-out, manual end-half, no score) | Shipped     | [scrimmage-mode](2026-05-25-scrimmage-mode.md)                                        |
| 2026-05-25 | Pitcher Performance Report (cross-game stats + Claude narrative) | Shipped     | [pitcher-performance-report](2026-05-25-pitcher-performance-report.md)                |
| 2026-05-25 | Org-scoped read-only team view (org coach can browse sibling teams) | Shipped  | [org-readonly-team-view](2026-05-25-org-readonly-team-view.md)                        |
| 2026-05-25 | Phase 2 G — Snackbar / Toast library eval (decision: keep hand-rolled) | Closed | [phase2-g-snackbar-eval](2026-05-25-phase2-g-snackbar-eval.md)                        |
| 2026-05-25 | Phase 2 J — Mobile role routing (player-role users see player dashboard) | Shipped | [phase2-j-mobile-role-routing](2026-05-25-phase2-j-mobile-role-routing.md)            |
| 2026-05-25 | Phase 2 E — In-play modal cleanup (InPlayModal, RunnerEvent split, RunnerAdvancement trim) | Shipped | [phase2-e-inplay-modal-cleanup](2026-05-25-phase2-e-inplay-modal-cleanup.md)          |
| 2026-06-01 | Velocity Sender — second-device velocity broadcast (no Stalker SDK required) | On hold (backend shipped `9a3023c`; mobile + sender pending) | [velocity-sender](2026-06-01-velocity-sender.md)                                       |
| 2026-06-04 | Stalker Pro 3s — spin (RPM) detection (`'9'` block decoded from real capture) | Planned (format reverse-engineered; build deferred) | [stalker-spin-detection](2026-06-04-stalker-spin-detection.md)                         |
