# Fix: CORS preflight blocks browser PATCH requests

| Date       | Type | Commit | Versions          |
| ---------- | ---- | ------ | ----------------- |
| 2026-05-14 | fix  | TBD    | api 1.6.1 → 1.7.0 |

## Context

Editing an opponent pitcher profile from the web app failed with:

```
Access to XMLHttpRequest at 'https://bvolante.com/bt-api/opponent-pitcher-profiles/<id>'
from origin 'https://pitch-tracker.bvolante.com' has been blocked by CORS policy:
Method PATCH is not allowed by Access-Control-Allow-Methods in preflight response.
```

The `cors` middleware in `packages/api/src/app.ts` was configured with an
explicit `methods` allowlist of `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`
— `PATCH` was omitted. The browser's CORS preflight (`OPTIONS`) therefore
advertised only those five verbs and refused to issue the real `PATCH`.

The same curl from a terminal worked because curl does not perform CORS
preflight; only browsers do.

## Decisions

Add `'PATCH'` to the `methods` allowlist. One-word fix.

Audited the rest of the API for other `PATCH` routes that would also have
been silently broken in the browser:

- `opponentBatterProfile.routes.ts:15` — `PATCH /opponent-batter-profiles/:id`
- `opponentPitcherProfile.routes.ts:16` — `PATCH /opponent-pitcher-profiles/:id`
- `scoutingReport.routes.ts:19` — `PATCH /scouting-reports/:id`
- `scoutingReport.routes.ts:24` — `PATCH /scouting-reports/batters/:batterId`

All four are now reachable from the browser with this single config change.

Considered dropping the explicit `methods` option entirely (the `cors`
package defaults include `PATCH`), but kept the explicit list so the
allowed surface stays auditable.

## What shipped

### packages/api

- `src/app.ts` — added `'PATCH'` to the `cors()` `methods` array.
- `package.json` — version `1.6.1` → `1.7.0`.

## Verification

- [x] `npx prettier --write` on changed file.
- [x] `npx tsc --noEmit` clean.
- [x] `npm test` green.
- [ ] After deploy: edit an opponent pitcher profile from the web app
      (name / handedness / jersey) — request succeeds, row updates.
- [ ] Edit an opponent batter scouting profile — PATCH succeeds.
- [ ] Update a scouting report — PATCH succeeds.

## Out of scope

- Adding CORS regression tests. The middleware config is static and the
  next time someone touches it they'll see this doc; integration tests
  for preflight headers would be overkill for a one-line allowlist.
- Switching to the `cors` library's defaults. Explicit allowlist is the
  safer pattern here.
