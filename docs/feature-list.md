# Pitch Tracker — Feature List

A cross-platform baseball pitch tracking, charting, and analytics application. This document inventories the features currently shipped in the monorepo, grouped by domain, with web/mobile availability noted for each.

- **Web** — React SPA (`packages/web`)
- **Mobile** — Expo Router / React Native (`packages/mobile`)
- **API** — Express + PostgreSQL backend (`packages/api`)

Legend: ✅ = available · ⚠️ = partial/limited · ❌ = not available

---

## 1. Authentication & Accounts

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Email/password registration (first/last name, registration type) | ✅ | ✅ |
| Login with JWT auth, rate-limited | ✅ | ✅ |
| Profile retrieval | ✅ | ✅ |
| Role-based registration types (coach, player, org_admin) | ✅ | ✅ |
| Persistent token storage (localStorage / AsyncStorage) | ✅ | ✅ |

Pages/screens: [Login](packages/web/src/pages/Login/Login.tsx), [mobile login](packages/mobile/app/(auth)/login.tsx), [mobile register](packages/mobile/app/(auth)/register.tsx).

---

## 2. Teams & Organizations

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Create/update/delete teams (HS, travel, club, college) | ✅ | ✅ |
| Team metadata (abbrev, city, org, age group, season, year) | ✅ | ✅ |
| Team branding — logo upload, primary/secondary/accent colors | ✅ | ⚠️ |
| Team search | ✅ | ✅ |
| Team detail with roster view | ✅ | ✅ |
| Team member management (owner, coach, assistant, player) | ✅ | ✅ |
| Organization ownership & membership (owner, admin, coach) | ✅ | ⚠️ |
| Add/remove org members by email | ✅ | ❌ |

Pages/screens: [Teams](packages/web/src/pages/Teams/Teams.tsx), [TeamDetail](packages/web/src/pages/TeamDetail/TeamDetail.tsx), [TeamSettings](packages/web/src/pages/TeamSettings/TeamSettings.tsx), [mobile teams tab](packages/mobile/app/(tabs)/teams.tsx), [mobile team detail](packages/mobile/app/team/[id]/index.tsx).

---

## 3. Invitations & Join Requests

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Generate team invite link with token + expiration | ✅ | ✅ |
| Invite by email or specific player | ✅ | ✅ |
| Role-scoped invites (owner/coach/assistant/player) | ✅ | ✅ |
| Accept invite via token | ✅ | ✅ |
| Revoke/list pending invites | ✅ | ✅ |
| Player join request with optional message | ✅ | ✅ |
| Owner/coach approve or deny join requests | ✅ | ✅ |
| User's own join-request history | ✅ | ✅ |

Pages/screens: [InviteAccept](packages/web/src/pages/InviteAccept/InviteAccept.tsx), [JoinTeam](packages/web/src/pages/JoinTeam/JoinTeam.tsx), [mobile invite](packages/mobile/app/invite/[token].tsx), [mobile join-team](packages/mobile/app/join-team.tsx).

---

## 4. Roster & Player Management

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Create/update/delete players | ✅ | ✅ |
| Jersey number, position (P/C/1B/2B/3B/SS/LF/CF/RF/DH/UTIL) | ✅ | ✅ |
| Handedness — Bats (R/L/S switch), Throws (R/L) | ✅ | ✅ |
| Active/inactive toggle | ✅ | ✅ |
| Aggregate player stats across games | ✅ | ✅ |
| Pitcher pitch-type assignment (FB, 2S, 4S, CT, SNK, SL, CB, CH, SPL, KN, SCR, other) | ✅ | ✅ |
| Bulk CSV/spreadsheet roster import with validation | ✅ | ❌ |

Pages/screens: [RosterTable](packages/web/src/pages/TeamDetail/RosterTable.tsx), [RosterImport](packages/web/src/pages/TeamDetail/RosterImport.tsx), [PlayerForm](packages/web/src/pages/TeamDetail/PlayerForm.tsx).

---

## 5. Game Scheduling & Setup

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Create game (date, time, location, home/away) | ✅ | ✅ |
| Opponent name or linked opponent team | ✅ | ✅ |
| Charting mode — our pitcher, opponent pitcher, or both | ✅ | ✅ |
| Lineup size & total innings configuration | ✅ | ✅ |
| Status lifecycle (scheduled → in_progress → completed/cancelled) | ✅ | ✅ |
| Start/resume/end game | ✅ | ✅ |
| Toggle home/away | ✅ | ✅ |
| Delete/cancel game | ✅ | ✅ |
| Game history listing | ✅ | ⚠️ |

Pages/screens: [GameSetup](packages/web/src/pages/GameSetup/GameSetup.tsx), [GameHistory](packages/web/src/pages/GameHistory/GameHistory.tsx), [Dashboard](packages/web/src/pages/Dashboard/Dashboard.tsx), [mobile new game](packages/mobile/app/game/new.tsx), [mobile setup](packages/mobile/app/game/[id]/setup.tsx).

---

## 6. Lineups

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Opponent lineup — name, order, position, handedness | ✅ | ✅ |
| Bulk opponent lineup creation | ✅ | ✅ |
| My team lineup linked to roster players | ✅ | ✅ |
| Starter vs bench designation | ✅ | ✅ |
| Player substitutions with replacement tracking & inning entry | ✅ | ✅ |
| Active lineup filter (exclude substituted out) | ✅ | ✅ |
| Import opponent lineup from prior game / scouting report | ✅ | ⚠️ |

Pages/screens: [OpponentLineup](packages/web/src/pages/OpponentLineup/OpponentLineup.tsx), [MyTeamLineup](packages/web/src/pages/MyTeamLineup/MyTeamLineup.tsx), [mobile lineup](packages/mobile/app/game/[id]/lineup.tsx), [mobile my-lineup](packages/mobile/app/game/[id]/my-lineup.tsx).

---

## 7. Live Game Charting

| Feature | Web | Mobile |
| --- | :-: | :-: |
| At-bat creation with pitcher/batter selection | ✅ | ✅ |
| Count tracking (balls/strikes, outs before/after) | ✅ | ✅ |
| Pitch logging — type, velocity, actual & target location, zone, result | ✅ | ✅ |
| 17-zone strike zone grid with visual overlay | ✅ | ✅ |
| Pitch results (ball, called_strike, swinging_strike, foul, in_play, HBP) | ✅ | ✅ |
| LHH / RHH mirroring for zone layout | ✅ | ✅ |
| Heat zone overlay per pitcher during at-bat | ✅ | ✅ |
| Pitch history per at-bat / game / pitcher / batter | ✅ | ✅ |
| End at-bat with outcome | ✅ | ✅ |
| Dropped-third-strike prompt (Yes/No modal) | ✅ | ✅ |

Pages/screens: [LiveGame](packages/web/src/pages/LiveGame/LiveGame.tsx), [mobile live](packages/mobile/app/game/[id]/live.tsx).

---

## 8. Baserunners & Game State

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Base occupancy state (1B / 2B / 3B) | ✅ | ✅ |
| Diamond modal for runner updates | ✅ | ✅ |
| Runner advancement modal on contact | ✅ | ✅ |
| Baserunner events — caught stealing, pickoff, interference, passed ball, appeal out | ✅ | ✅ |
| Inning advancement (top/bottom tracking) | ✅ | ✅ |
| Inning change modal | ✅ | ✅ |
| Runs, hits, errors per inning | ✅ | ✅ |

Modals: [DiamondModal](packages/web/src/pages/LiveGame/DiamondModal.tsx), [RunnerAdvancementModal](packages/web/src/pages/LiveGame/RunnerAdvancementModal.tsx), [BaserunnerOutModal](packages/web/src/pages/LiveGame/BaserunnerOutModal.tsx), [InningChangeModal](packages/web/src/pages/LiveGame/InningChangeModal.tsx).

---

## 9. Plays (Balls in Play)

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Contact type (GB, FB, LD, PU, bunt) | ✅ | ✅ |
| Contact quality (hard/medium/soft/weak) | ✅ | ✅ |
| Hit direction & field location (pull/center/oppo, LF line → RF line, infield splits) | ✅ | ✅ |
| Hit depth (infield → warning track) | ✅ | ✅ |
| Hit result (1B/2B/3B/HR) or out type (GO/FO/LO/PO, DP/TP, FC, force/tag, CS) | ✅ | ✅ |
| Fielding position, error flag | ✅ | ✅ |
| RBIs & runs scored | ✅ | ✅ |
| Spray-chart visualization | ✅ | ⚠️ |

---

## 10. Pitch Calling (Coach → Pitcher)

| Feature | Web | Mobile |
| --- | :-: | :-: |
| 9-zone location grid + pitch type call (FB, CB, CH, SL, CT, 2S) | ⚠️ | ✅ |
| Human-readable zone labels (Up and In, Up the Middle, etc.) | ⚠️ | ✅ |
| Situational calls — pickoff (1B/2B/3B), bunt coverage, 1st-3rd, shake | ⚠️ | ✅ |
| Change call before transmit | ⚠️ | ✅ |
| Mark call transmitted | ⚠️ | ✅ |
| Retroactive call-result logging | ⚠️ | ✅ |
| Active call for current at-bat | ⚠️ | ✅ |
| Bluetooth audio / walkie-talkie hands-free comms | ❌ | ✅ |
| Call history per game / at-bat | ✅ | ✅ |
| Pitcher/game/season call accuracy analytics (type & zone match %) | ✅ | ✅ |
| Per-count breakdown (0-0, 0-1, 1-0, …) | ✅ | ✅ |

Pages/screens: [mobile pitch-calling](packages/mobile/app/game/[id]/pitch-calling.tsx), [mobile pitch-call-analytics](packages/mobile/app/game/[id]/pitch-call-analytics.tsx).

---

## 11. Bullpen Training

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Create bullpen session (date, pitcher, intensity low/med/high) | ✅ | ✅ |
| Live pitch logging with target + actual location, velocity, result | ✅ | ✅ |
| Session status (in_progress, completed, cancelled) | ✅ | ✅ |
| Session summary (totals, strike %, target accuracy, pitch mix) | ✅ | ✅ |
| Pitcher bullpen history | ✅ | ✅ |
| Team bullpen session listing | ✅ | ✅ |
| Bullpen plans — named sequences (pitch type, target zone, instruction, max pitches) | ✅ | ❌ |
| Assign/unassign plan to pitcher | ✅ | ❌ |
| Performance summary per session | ✅ | ✅ |

Pages/screens: [BullpenSessions](packages/web/src/pages/BullpenSessions/BullpenSessions.tsx), [BullpenNew](packages/web/src/pages/BullpenNew/BullpenNew.tsx), [BullpenLive](packages/web/src/pages/BullpenLive/BullpenLive.tsx), [BullpenPlans](packages/web/src/pages/BullpenPlans/BullpenPlans.tsx), [BullpenPlanEditor](packages/web/src/pages/BullpenPlanEditor/BullpenPlanEditor.tsx), [mobile bullpen new](packages/mobile/app/bullpen/new.tsx), [mobile bullpen live](packages/mobile/app/bullpen/[id]/live.tsx), [mobile bullpen summary](packages/mobile/app/bullpen/[id]/summary.tsx).

---

## 12. Pitcher Analytics

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Pitcher career profile (games, pitches, batters faced, strike %, target accuracy) | ✅ | ⚠️ |
| Game logs with opponent, location, pitch-type breakdown, pagination | ✅ | ⚠️ |
| Per-game pitch-type breakdown (count, strikes/balls, velocity, usage, top velo) | ✅ | ✅ |
| Strike % and target accuracy per pitch type | ✅ | ✅ |
| 9-zone pitcher heat map (usage, strike %, frequency) | ✅ | ✅ |
| Live tendencies during game — pitch mix, zone usage, suggested sequence | ✅ | ✅ |

Pages/screens: [PitcherProfile](packages/web/src/pages/PitcherProfile/PitcherProfile.tsx).

---

## 13. Batter Analytics & Matchups

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Batter history vs pitcher (ABs, pitches seen) | ✅ | ⚠️ |
| Batting stats (AB, H, BB, K, AVG) | ✅ | ⚠️ |
| Batter heat map — zone counts, swings, hits, average | ✅ | ⚠️ |
| Spray chart by contact quality / result | ✅ | ⚠️ |
| Live hitter tendencies — zone weakness, pitch-type vulnerability, chase/whiff rates | ✅ | ✅ |
| Suggested sequence from weakness data | ✅ | ✅ |

---

## 14. Opponent Scouting Reports

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Pre-game team scouting report (steal / bunt / hit-and-run tendencies: low/med/high) | ✅ | ✅ |
| Per-batter profiles — name, jersey, order, handedness, notes | ✅ | ✅ |
| Pitch vulnerabilities (free-form tags) | ✅ | ✅ |
| 9-zone weakness map (hot/cold/neutral) | ✅ | ✅ |
| Auto-detected tendencies with confidence — chase, takes, aggressive, passive, first-pitch | ✅ | ✅ |
| Chase rate, watch rate, first-pitch take rate, breaking-ball chase | ✅ | ✅ |
| Live batter matching by jersey/name during game | ✅ | ✅ |
| Link report to specific game | ✅ | ✅ |

Pages/screens: [ScoutingReports](packages/web/src/pages/ScoutingReports/ScoutingReports.tsx), [ScoutingReport](packages/web/src/pages/ScoutingReport/ScoutingReport.tsx), [mobile scouting list](packages/mobile/app/team/[id]/scouting/index.tsx), [mobile scouting report](packages/mobile/app/team/[id]/scouting/[reportId].tsx).

---

## 15. Performance Summaries & AI Narratives

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Auto-generate summary for game or bullpen session | ✅ | ✅ |
| Totals, strike %, target accuracy, pitch-type breakdown | ✅ | ✅ |
| Benchmarked metrics vs historical average (highlight / concern / neutral) | ✅ | ✅ |
| AI narrative generation and regeneration | ✅ | ✅ |
| Per-batter pitch-by-pitch breakdown per at-bat | ✅ | ✅ |

Pages/screens: [mobile game performance-summary](packages/mobile/app/game/[id]/performance-summary.tsx), [mobile bullpen performance-summary](packages/mobile/app/bullpen/[id]/performance-summary.tsx).

---

## 16. Spectator / Viewer Mode

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Read-only live game view (score, inning, runners, pitch sequence) | ✅ | ✅ |
| Pitcher stats & batter trends in real time | ✅ | ✅ |
| Heat-zone overlays | ✅ | ✅ |
| Charter vs viewer role assignment per user per game | ✅ | ✅ |

Pages/screens: [ViewerDashboard](packages/web/src/pages/LiveGame/ViewerDashboard.tsx), [mobile viewer](packages/mobile/app/game/[id]/viewer.tsx).

---

## 17. Real-Time Sync

| Feature | Web | Mobile |
| --- | :-: | :-: |
| WebSocket game state updates (URL derived from API base) | ✅ | ✅ |
| Pitch logged / at-bat ended / inning changed / runners updated events | ✅ | ✅ |
| Offline action queue & replay on reconnect | ❌ | ⚠️ |

---

## 18. Platform & UX

| Feature | Web | Mobile |
| --- | :-: | :-: |
| Dashboard landing page | ✅ | ✅ (home tab) |
| Settings screen | ⚠️ | ✅ |
| Tablet vs phone device detection & layout | ❌ | ✅ |
| Landscape-friendly live game | ⚠️ | ✅ |
| Emotion theme tokens (colors, spacing, shadows, radii, typography) | ✅ | ❌ (RN Paper) |
| React Native Paper component library | ❌ | ✅ |

Pages/screens: [Dashboard](packages/web/src/pages/Dashboard/Dashboard.tsx), [mobile index tab](packages/mobile/app/(tabs)/index.tsx), [mobile settings tab](packages/mobile/app/(tabs)/settings.tsx).

---

## 19. Role-Based Access Control

| Role | Capabilities |
| --- | --- |
| Team owner | Full team management, delete team, all coach/assistant powers |
| Team coach | Create invites, approve join requests, roster edits, charting |
| Team assistant | Roster edits, pitch type assignment, charting |
| Team player | View team info and own analytics |
| Organization owner / admin | Org-level team and member management |

Enforced on both web and mobile via the same API middleware.

---

## Summary

- **22 feature domains** spanning authentication, team/org management, live charting, bullpen, scouting, analytics, and AI summaries.
- **Near-complete parity** on the core flows: live game charting, at-bat/pitch logging, baserunners, lineups, bullpen sessions, and scouting reports all exist on both platforms.
- **Web-primary** areas: roster CSV import, bullpen plans editor, organization member administration, deep analytics dashboards.
- **Mobile-primary** areas: pitch calling with Bluetooth/walkie-talkie audio, one-handed call grid, tablet/phone-responsive live game UI, offline action queue.
