# Velocity Sender — Second-Device Velocity Broadcast (no Stalker SDK required)

- **Date saved:** 2026-06-01
- **Status:** **On hold** — backend foundation shipped in `9a3023c`; mobile primary-charter wiring + sender web page not started.
- **Origin:** 5-adviser council exercise + user-locked decisions in the same session.

## Current state (as of save)

**Shipped in `9a3023c`** (tsc clean, `jest velocityCall` 11/11):

- `packages/shared/src/index.ts` — `WsMessageType` extended with `'velocity_call'`.
- `packages/api/src/migrations/048_velocity_sender_codes.sql` — new table for 6-char sender codes (game_id FK, expires_at, last_used_at).
- `packages/api/src/services/velocityCall.service.ts` — `mintCode` / `sendVelocity` / `describeCode`.
- `packages/api/src/controllers/velocityCall.controller.ts` — three endpoints (mint auth-gated; send + describe public).
- `packages/api/src/routes/velocityCall.routes.ts` — registered at `/bt-api/velocity-calls` in `app.ts`.
- `packages/api/src/__tests__/velocityCall.routes.test.ts` — 11 tests covering auth, mint, send validation, pg_notify payload shape, describe lookup.

**Not started:**

- Mobile primary-charter `velocity_call` handler + pairing/TTL/no-overwrite rules.
- Mobile "Show Sender Code" modal.
- Sender web page (route in `packages/marketing` vs new `packages/sender` — undecided).
- Versions, change doc, mobile parity check.

**To resume:** start fresh from `main`; the backend is already on `origin/main`. The next chunks are mobile + sender — see the open decisions at the bottom of this doc.

---

## Context

Coaches want a second person — typically the parent or assistant holding the radar gun — to record velocity for the current at-bat in PitchChart. The ideal version of this is "connect the Stalker Pro 3s directly to the app," but the reverse-engineered Pro3S BLE stream never returned a live reading (only an idle frame), the radar feature is currently disabled (`RADAR_FEATURE_ENABLED = false` in `packages/mobile/src/utils/stalkerRadar/stalkerRadarService.ts:13`), and the official Stalker SDK is not on a known timeline.

This plan is **not** a Stalker integration. It builds the secondary-device UX that the Stalker SDK would eventually plug into. Today the second device is a human; tomorrow it's a radar; the wire format and primary UI are identical.

Current constraints to respect (do not change):

- **One charter per game.** Enforced by a partial unique index on `game_roles (game_id) WHERE role='charter'`. A second device today is auto-routed to viewer mode.
- **`pitch_call` already exists** as the primitive for "a second device pre-fills a field on the primary charter's pitch form." Handler lives at `packages/mobile/app/game/[id]/useLiveGameController.ts:396–414`. Reuse, don't reinvent.
- **Velocity is not broadcast** in the `pitch_logged` event; it's purely local to the charter's form.

Council decision (5-adviser exercise, Chairman + user lock):

- **Metric of success:** ten consecutive pitches, velocity lands on the right pitch within 5 seconds, with correct staleness behavior when the gun fires before the pitch is logged.
- **Sender surface:** no-install web page (`pitchchart.app/send/<code>`). The radar holder is typically not an app installer.
- **Conflict rule:** don't overwrite — show a "tap to apply" pill when the charter has already typed a velocity.

## Approach

Add one new WebSocket event (`velocity_call`), one POST endpoint to publish it, one handler on the primary charter, and one tiny standalone web page for the sender. **No changes to game_roles, no lift of the one-charter constraint, no Stalker dependency.**

### 1. Backend — `velocity_call` event + publish endpoint  ✅ SHIPPED (`9a3023c`)

**Files in the commit:**

- `packages/shared/src/index.ts` — `WsMessageType` extended with `'velocity_call'`.
- `packages/api/src/migrations/048_velocity_sender_codes.sql` — `velocity_sender_codes(code PK, game_id FK, created_by, created_at, expires_at, last_used_at)`.
- `packages/api/src/services/velocityCall.service.ts`:
    - `mintCode(gameId, createdBy, ttlMinutes = 240)` — generates a 6-char code from an unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` — no 0/O/1/I/L), retries on PK collision, opportunistically GCs expired rows for the same game.
    - `sendVelocity(code, velocity, senderLabel?)` — validates 20–130 mph, looks up code → game_id, `pg_notify('game_<id>', { type: 'velocity_call', id: code, game_id, velocity, sent_at, sender_label })`. Reuses the same Postgres LISTEN/NOTIFY path `pitch_call` uses.
    - `describeCode(code)` — public lookup used by the sender page to verify the code is alive.
- `packages/api/src/controllers/velocityCall.controller.ts` — three methods; `mintCode` auth-gated upstream, `sendVelocity` and `describeCode` are public.
- `packages/api/src/routes/velocityCall.routes.ts`:
    - `POST /bt-api/velocity-calls/send` — public; `{ code, velocity, sender_label? }` → broadcast.
    - `GET /bt-api/velocity-calls/codes/:code` — public describe.
    - `POST /bt-api/velocity-calls/games/:gameId/codes` — auth-gated mint.
- `packages/api/src/app.ts` — registered at `/bt-api/velocity-calls`.
- `packages/api/src/__tests__/velocityCall.routes.test.ts` — 11 tests, all passing.

**Architectural decision worth flagging:** the public `/send` endpoint accepts the 6-char code as the only credential. Anyone with the code (4-hour default TTL, mintable only by an authenticated charter) can post a velocity to that game. That's the zero-install trade-off from the council. Risk: someone who shoulder-surfs the code can spam fake velocities until TTL expires. Mitigations available later: per-code rate limit (e.g., 1 req/sec), per-game socket limit, or upgrade to a signed short-lived token. **Not in v1.**

### 2. Primary charter (mobile) — NOT STARTED

**File:** `packages/mobile/app/game/[id]/useLiveGameController.ts`

In the `useGameWebSocket` block near line 396, next to the existing `pitch_call` handler, add a `velocity_call` handler. Three pairing rules, all required for v1:

1. **Bind to the most recent unlogged pitch within a 20-second TTL.** Track `velocityCallReceivedAt`. If a pitch hasn't been logged within 20 seconds of receipt, the badge goes **stale** (grayed, timestamp visible), and the value is **not auto-applied** to a new pitch logged after the TTL expires.
2. **Do not overwrite a manually typed velocity.** If `velocity` already has a value the user typed (track an `isManual` flag on the local state), the incoming broadcast surfaces as a **"📡 92 from sender · tap to replace"** chip next to the field, never as a silent overwrite.
3. **Display source + age.** When auto-applied or pending, show a small badge: `📡 92 (sender · 3s ago)`. Replace with a stale variant when the TTL expires.

Also: expose a "Show Sender Code" action somewhere on the live screen (settings panel or near the velocity field). Tapping it reveals a 6-char code + a QR/URL shortcut to `pitchchart.app/send/<code>` so the radar holder can scan it on their phone.

### 3. Sender surface — no-install web page — NOT STARTED

**Implementation packaging:** undecided. Three options the user did not pick between when the session was canceled:

- Route inside `packages/marketing` (recommended — reuses Vite + React + Emotion + deploy from `2026-05-25-marketing-site.md`).
- New `packages/sender` (cleaner boundary, more CI surface).
- Static HTML in `api/public` (fastest to iterate, no build step).

**Page contract** (`/send/<code>` or `/send` + code entry):

- Big number input + on-screen number pad (mobile-first).
- One large "Send" button. Haptic on tap (web Vibration API if available; no-op otherwise).
- Last-3-sends log so the sender doesn't double-tap or worry whether the previous send went through.
- Connection state visible: "Connected to game · 92 sent 3s ago" or "Reconnecting…"
- Posts to `POST /bt-api/velocity-calls/send` with `{ code, velocity }`.
- No login. No app install. Works on any browser. iOS Safari and Android Chrome are the targets.

### 4. Out of scope (deferred — do not litigate this round)

- Stalker (or any vendor) BLE auto-feed into the sender device. Same UI, same wire format; just replaces the human tap when an SDK lands.
- An in-app "Send Velocity" panel on the existing viewer screen. Reasonable v2 once power users with two iPads ask for it; do **not** ship it before the web page is proven.
- Multi-message "co-pilot protocol" (Expansionist's framing). One event type for now; revisit when there's a second use case.
- Lifting the one-charter-per-game constraint or adding a new `game_roles` role.
- Vendor selection conversation (Pocket Radar vs Stalker vs Bushnell).
- Subscription tier / paid gating of the feature. Decide after a month of usage.

## Critical files (modified + created)

**API (shipped in `9a3023c`):**

- `packages/shared/src/index.ts` — `WsMessageType` add.
- `packages/api/src/migrations/048_velocity_sender_codes.sql`
- `packages/api/src/services/velocityCall.service.ts`
- `packages/api/src/controllers/velocityCall.controller.ts`
- `packages/api/src/routes/velocityCall.routes.ts`
- `packages/api/src/app.ts` (one import + one `app.use`)
- `packages/api/src/__tests__/velocityCall.routes.test.ts`

**Mobile (primary charter) — not started:**

- `packages/mobile/app/game/[id]/useLiveGameController.ts` — `velocity_call` handler + the three pairing rules; expose state for the badge.
- `packages/mobile/app/game/[id]/LiveGamePhone.tsx` + `LiveGameTablet.tsx` — render the source badge / stale chip / "tap to apply" pill next to the velocity field; add a "Show Sender Code" affordance.
- `packages/mobile/src/components/live/SenderCodeModal/` — modal with code + QR + URL. Mints a fresh code via the new endpoint on open.

**Sender (new) — not started.** Decide the packaging first.

**Versions to bump on ship:** `api`, `mobile`, and (`marketing` or new `sender`).

## Verification

1. **Stalker call (in parallel — does not block):** email + phone Stalker. Document SDK access terms, iOS support, timeline in a separate `docs/plans/2026-06-stalker-sdk-status.md`.
2. **Coach call:** one real coach. Confirm the web-page-with-code shape is preferred over installing the app on a second iPad.
3. **API tests:** `cd packages/api && npx jest velocityCall` — 11/11 already passing on the saved-state branch.
4. **Manual two-device test (the contract test for v1):**
    - Open a live game on the primary mobile device. Reveal the sender code.
    - On a laptop browser, open `pitchchart.app/send/<code>`.
    - Ten consecutive pitches. For each: sender types a velocity → primary form pre-fills within 5 seconds → primary logs the pitch → velocity attaches to that pitch row.
    - Edge cases to verify in the same session:
        - Sender sends a velocity, charter doesn't log within 20s → badge goes stale, next pitch logged after that does NOT inherit the stale value.
        - Charter has already typed `91` → incoming `92` shows as a tap-to-apply chip, never silently overwrites.
        - Sender goes offline mid-game → page shows reconnecting; queued send fires when reconnection happens.
5. **`/check`:** TypeScript clean on api / mobile / sender; eslint clean on web + sender touched paths; mobile jest passes.
6. **Change doc:** `docs/changes/<date>-velocity-sender.md` with Context, Plan (this file), What shipped, Verification, Out of scope. Per CLAUDE.md.

## Why not the bigger version (yet)

The Expansionist's "co-pilot protocol" is the right second move, not the first. Ship `velocity_call` as a single event type with a complete pairing/staleness/conflict story. If usage justifies it, the second message type (`play_call`, `lineup_call`, etc.) is one schema extension away. The Stalker SDK arrival is also downstream of this — when it lands, the sender device's velocity input gets auto-filled by the radar instead of by a human tap. Zero changes to the primary charter or the wire format. Build the people-version of the pipeline first.

## Open decisions parked for resume

1. **Sender packaging** — route in `packages/marketing` (recommended) vs new `packages/sender` vs static HTML in `api/public`. Pick before sender work starts.
2. **Cadence** — commit the backend foundation as a self-contained slice now, then mobile in a second commit and sender in a third? Or build it all and commit once? The backend is independently testable; the 3-commit shape is recommended.
3. **Rate limiting on `/send`** — defer for v1 or add at ship? Council Chairman flagged the abuse vector but recommended deferring; revisit if shoulder-surfing in a dugout is a real concern.

---

_This plan was saved from a paused implementation session. The `~/.claude/plans/looking-for-a-way-synchronous-puzzle.md` scratch file may be overwritten by a future plan-mode entry; this document under `docs/plans/` is the canonical record._
