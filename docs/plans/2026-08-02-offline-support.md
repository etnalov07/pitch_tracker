# Offline Support (PWA) — Forward Design Plan

| Field  | Value                                                                    |
| ------ | ------------------------------------------------------------------------ |
| Date   | 2026-08-02                                                               |
| Type   | feat (architecture)                                                      |
| Status | Draft — scoping only, not yet approved                                   |
| Owner  | brian.volante@bvolante.com                                               |
| Scope  | `packages/web` (primary), `packages/api`, `packages/shared`; mobile note |

---

## 1. Context

PitchChart's web app (`https://pitch-tracker.bvolante.com`, Namecheap FTP-hosted CRA
build) is a browser-only SPA. It ships a PWA `manifest.json` (`display: standalone`,
icons, theme color) so it is **installable** to a home screen — but there is **no
service worker** (`packages/web/src/index.tsx` never registers one; the CRA boilerplate
was stripped). Installable ≠ offline. With no network, you get the dinosaur, not the app.

The ask: make the app usable without a connection. The valuable case is **live-game
charting on a phone at a field with no signal** — not just reading old reports.

That's the whole ballgame, and it's not a config flip. What is the DEAL with just
registering a service worker? It'd cache the shell and nothing else — the live game
would still die on the first pitch, because every write hits the server synchronously.

## 2. Current-state analysis — why this is hard (the crux)

The live-game write path (`packages/web/src/pages/LiveGame/useLiveGameActions.ts`) is
**server-authoritative and ID-chained**. Concretely:

1. **Downstream calls depend on server-assigned IDs.**
   `createAtBat` → returns `atBat.id` → threaded into `logPitch({ at_bat_id })` →
   returns `pitch.id` → threaded into `recordPlay({ pitch_id })` and
   `pitchCallService.linkPitch(callId, pitch.id)`. Innings come from
   `gamesApi.getCurrentInning()` → `inning.id`. Every step needs the previous step's
   server round-trip to have completed.

2. **The server derives authoritative state.** `outs_after`, re-derived `base_runners`,
   and score are computed server-side. The client repeatedly **re-fetches**
   (`fetchGameById`, `getCurrentInning`) after writes specifically to avoid stale-closure
   overwrites (see the comments in `advanceInning` / `updateScoreForRuns`).

3. **Ordering is strict.** Count → outs → inning advance → score all mutate shared
   game state in sequence. A naive "queue the failed requests and replay them" approach
   breaks the moment step 2 needs an ID that step 1 hasn't gotten yet.

**Implication:** true offline live-charting requires the client to stop depending on the
server round-trip mid-at-bat. That means (a) client-generated IDs, (b) a client-side copy
of the scoring rules the server currently owns, and (c) an idempotent, ordered sync queue.
This is real architecture, not a plugin. Anyone who says otherwise — the Jerk Store called.

## 3. Goals & non-goals

**Goals**
- Installable, offline-launchable app (shell + assets cached).
- Offline **viewing** of already-loaded games, rosters, reports.
- Offline **live-game charting**: log pitches, at-bats, outs, runners, score with zero
  connectivity; auto-sync when the network returns.
- No data loss and no duplicate rows across a flaky-network game (the Namecheap-FTP
  crowd knows flaky).

**Non-goals (this plan)**
- Real-time multi-device collaboration while offline (two coaches charting the same game
  on two disconnected devices). Deferred — see §9.
- Offline auth / new-user registration. Token must already be present in `localStorage`.
- Offline for the analytics/AI-narrative features that call server-side compute.
- Mobile (React Native) offline — the native app has its own persistence story; this plan
  is web-first. Parity note in §8.

## 4. Options considered

| Option | What it is | Verdict |
| ------ | ---------- | ------- |
| **A. SW shell + read cache only** | Register a service worker, precache the CRA build, cache GET responses (stale-while-revalidate). | **Ship as Phase 0.** Cheap, high value for viewing. Does *nothing* for live charting. |
| **B. Request-replay queue** | Intercept failed writes, queue raw axios calls, replay FIFO on reconnect. | **Rejected.** Cannot thread server IDs between queued calls (§2.1); can't compute count/outs offline (§2.2). Fragile — a festivus grievance waiting to happen. |
| **C. Client-authoritative IDs + local scoring engine + sync queue** | Client generates UUIDs, computes count/outs/score/runners locally using shared rules, persists an ordered mutation log, syncs idempotently. | **Recommended for Phase 1.** The only design that survives §2. Higher cost, but it's the actual feature. |

## 5. Recommended approach — phased

### Phase 0 — PWA shell + offline read (small, ship first)

Make the app **launch and view** offline. No write changes.

- Register a service worker (Workbox via `workbox-webpack-plugin`, or CRA's
  `serviceWorkerRegistration` re-added). Precache the build manifest; runtime-cache
  same-origin GETs to `/bt-api/**` with stale-while-revalidate; navigation fallback to
  `index.html` for client-side routes.
- Add an offline indicator (online/offline banner) driven by `navigator.onLine` +
  `online`/`offline` events.
- **Namecheap caveat:** the FTP deploy uses `dangerous-clean-slate: false` (overlay, no
  wipe — `deploy-web.yml:53`). Stale precached assets + hashed filenames are fine, but the
  SW must `skipWaiting`/`clientsClaim` carefully and cache-bust on version change, or users
  pin to an old shell. Add a "new version available — refresh" prompt.

### Phase 1 — Offline live-game charting (the real work)

Move the source of truth for an in-progress game onto the device, sync opportunistically.

**1. Client-generated IDs (`packages/shared` + `packages/api`).**
Switch pitch / at-bat / baserunner-event / play IDs to client-suppliable UUIDs (v4).
API write endpoints accept an optional `client_id` (or `id`) and treat it as an
**idempotency key** — insert-or-return-existing. This kills duplicate rows on replay and
lets the client thread IDs before the server ever sees them.

**2. Local scoring engine (`packages/shared`).**
Extract/duplicate the count/outs/score/runner-advancement rules the server owns today into
pure shared functions (some already exist: `getSuggestedAdvancement`, `getOutsForResult`,
`clearBases`, `getNextBatter`). The client computes next count/outs/base state locally
instead of re-fetching. Server remains the reconciler on sync. **Risk:** rule drift between
client and server — mitigate by making the *server* import the same shared functions so
there is one implementation (DRY — no hugging, no learning across two copies).

**3. Durable local store (`packages/web`).**
IndexedDB (via `idb` or Dexie — small, no native module) holding: the active game
aggregate, and an **append-only mutation log** (ordered, each entry = {clientId, type,
payload, syncState}). `localStorage` is too small/synchronous for a full game.

**4. Optimistic write layer (`packages/web`).**
Refactor the write path so `useLiveGameActions` calls a local `gameStore.apply(mutation)`
that (a) updates in-memory Redux/UI state immediately, (b) appends to the IndexedDB log,
(c) enqueues a sync task. UI never awaits the network. The existing `.unwrap()`-then-thread
pattern is replaced by "generate clientId now, use it immediately."

**5. Sync engine (`packages/web`).**
Background processor: drains the mutation log in order, POSTs with the idempotency key,
marks entries synced. Retries with backoff; resumes on `online` event and on app focus.
Because writes are idempotent and ordered, a mid-sync crash is safe to replay.

**6. Reconciliation.**
On successful sync of a game, re-fetch the server aggregate and reconcile derived fields
(score, outs) against local. For a single-device game these should match; divergence →
surface a non-destructive "sync review" rather than silently overwriting.

### Phase 2 — Conflict handling / multi-device (deferred, scoped in §9)

## 6. File-level scope (preflight-style)

**shared** (`packages/shared/src/index.ts`, rebuild after)
- New/uplifted pure scoring functions (count, outs, score, runner advancement) as the
  single source of truth imported by both web and api.
- Types: `ClientMutation`, `MutationType`, `SyncState`; add optional `client_id` to pitch /
  at-bat / baserunner-event / play create payloads.

**api** (`packages/api`)
- Migration: add nullable `client_id` (UUID, unique per table) to `pitches`, `at_bats`,
  `baserunner_events`, `plays` (and any table written mid-game). Unique index for
  idempotency.
- Controllers/services: accept `client_id`; upsert-or-return-existing (idempotent insert).
- Import the shared scoring functions server-side to guarantee parity (replace bespoke
  server math where it duplicates shared logic).
- `GET` endpoints unchanged, but confirm they're safe to runtime-cache (no per-request
  side effects).

**web** (`packages/web`) — version bump on ship
- `src/index.tsx`: register the service worker (Phase 0).
- Service worker + Workbox config; version-aware update prompt.
- New `src/offline/`: IndexedDB wrapper, mutation log, sync engine, online/offline context.
- Refactor `useLiveGameActions.ts` + `gamesApi` to the optimistic client-id flow.
- Offline/queued UI affordances (banner, per-game "synced/pending" badge).

**mobile** (`packages/mobile`)
- No code this plan. Note parity gap in the change doc; native offline is a separate track
  (AsyncStorage/SQLite-free per the iOS 26.2 constraints in `.claude/rules/mobile.md`).

## 7. Data model / API changes

- `client_id UUID` idempotency column + unique index on each mid-game write table.
- Write endpoints: `INSERT ... ON CONFLICT (client_id) DO NOTHING RETURNING *`, falling
  back to a select so a replayed call returns the original row.
- No breaking changes to existing payloads — `client_id` is additive/optional, so
  online-only clients keep working during rollout.

## 8. Platform parity

Web-first. Mobile keeps its current online behavior; the change doc must record the
deliberate web/mobile offline asymmetry so `/parity-check` doesn't flag it as a regression.

## 9. Out of scope (deferred)

- **Multi-device offline merge / CRDT-style conflict resolution.** Single-device offline
  only. Two disconnected charters on one game is a future plan.
- **Offline auth / registration.** Requires a cached token already present.
- **Offline analytics / AI narrative** (server compute).
- **Mobile (RN) offline persistence.**
- **Offline media/video** (large blobs; separate storage-budget conversation).

## 10. Risks

- **Client/server scoring drift** → single shared implementation (§5.2) is mandatory, not
  optional.
- **Namecheap overlay deploys** (`dangerous-clean-slate: false`) can pin stale SW/shell →
  version-gated SW update + refresh prompt.
- **IndexedDB eviction** under storage pressure on iOS Safari → keep the active-game
  payload small; warn if persistence isn't granted (`navigator.storage.persist()`).
- **Scope creep into multi-device** — hold the line at §9.

## 11. Verification (when built)

- Phase 0: DevTools → Application → offline; reload; app shell + last-viewed game render.
  Lighthouse PWA audit passes (installable + offline).
- Phase 1: start a live game, DevTools offline, chart a full half-inning (pitches, an
  in-play, runner advances, inning change), go online; confirm every row lands **once**
  (no dupes), score/outs/runners match, mutation log drains to empty.
- Idempotency: replay the same mutation log twice → identical DB state.
- Regression: online-only flow unchanged for a client that never sends `client_id`.

## 12. Recommendation

Ship **Phase 0 now** (real value, low risk, a day or two). Treat **Phase 1** as its own
approved plan with the shared-scoring extraction as the first, riskiest milestone — that's
the piece that, done right, makes the rest fall into place. Gold, Jerry, gold.
