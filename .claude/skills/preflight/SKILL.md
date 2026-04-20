---
name: preflight
description: Before implementing a feature or fix, enumerate every file that needs to change grouped by package. Surfaces missing touchpoints before coding starts.
allowed-tools: Read, Glob, Grep, Bash(git log *), Bash(git diff *), Bash(git grep *)
argument-hint: <feature description>
user-invocable: true
---

# Preflight — File Manifest Before Implementation

Enumerate every file that will need to change for the requested feature, before any code is written.

## Invocation

`/preflight <feature description>`

## Procedure

### Step 1: Understand the Feature

Parse `$ARGUMENTS` for the feature description. If not provided, ask the user what they want to implement.

### Step 2: Identify the Domain

Map the feature to one or more domains based on keywords:

| Keywords | Domain |
|----------|--------|
| auth, login, register, token | auth |
| team, roster, player | teams |
| game, pitch, lineup, at-bat, count, inning | games |
| bullpen | bullpen |
| invite, email | invites |
| analytics, scouting, heatmap, spray chart, tendencies | analytics |
| pitch call, audio, bluetooth, zone | pitch calling |

### Step 3: Read Existing Code for Each Domain

For each matched domain, use Glob and Grep to find the currently existing files in:

- `packages/api/src/routes/`
- `packages/api/src/controllers/`
- `packages/api/src/services/`
- `packages/api/src/migrations/`
- `packages/web/src/pages/`
- `packages/web/src/components/<domain>/`
- `packages/web/src/services/`
- `packages/mobile/app/`
- `packages/mobile/src/components/<domain>/`
- `packages/mobile/src/state/<domain>/`
- `packages/shared/src/`

Read any directly relevant files to understand the current architecture.

### Step 4: Enumerate the File Manifest

Output a table of ALL files that will need to change or be created:

```
## Preflight: <Feature Name>

### shared
| File | Action | What changes |
|------|--------|--------------|
| packages/shared/src/index.ts | Modify | Add <NewType> interface |

### backend
| File | Action | What changes |
|------|--------|--------------|
| packages/api/src/services/game.service.ts | Modify | Add <method> |
| packages/api/src/controllers/game.controller.ts | Modify | Add <endpoint handler> |
| packages/api/src/routes/game.routes.ts | Modify | Register new route |
| packages/api/src/migrations/XXX_<name>.sql | Create | Schema change |

### web
| File | Action | What changes |
|------|--------|--------------|
| packages/web/src/services/gameService.ts | Modify | Add API call |
| packages/web/src/pages/GamePage/GamePage.tsx | Modify | Add UI |

### mobile
| File | Action | What changes |
|------|--------|--------------|
| packages/mobile/src/state/game/api/gameApi.ts | Modify | Add API call |
| packages/mobile/src/components/live/LiveScreen.tsx | Modify | Add UI |
```

### Step 5: Flag Missing Touchpoints

After listing files, call out any commonly missed touchpoints:

- **Route registration**: Is the new route registered in `packages/api/src/app.ts`?
- **Redux slice**: If new state is needed on mobile, does a new slice need to be added to `packages/mobile/src/state/store.ts`?
- **Shared rebuild**: Are any new types being added to `packages/shared`? (Remind user to run `npm run build`)
- **Navigation entry point**: Is there a new screen? Does it need to be reachable from an existing screen?
- **DB migration**: Does the schema change? Is a numbered migration file needed?
- **Both platforms**: If this is a UI feature, are BOTH web and mobile listed? If one is intentionally excluded, note why.

### Step 6: Confirm with User

Ask: "Does this file manifest look complete? Any files I'm missing or that should be excluded?"

Only after the user confirms should implementation proceed.

## Notes

- The goal is to surface gaps BEFORE coding, not after
- Err on the side of listing more files — it's easy to skip one during implementation if it turns out to be unneeded
- If the feature is mobile-only or web-only, explicitly note that and confirm with the user
- For bug fixes, the manifest may be small (1-3 files) — that's fine, still enumerate them
