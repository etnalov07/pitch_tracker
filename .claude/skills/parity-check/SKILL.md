---
name: parity-check
description: Cross-check web and mobile feature parity when changes are made. Identifies missing API calls, payload mismatches, and UI gaps.
allowed-tools: Read, Glob, Grep, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(ls *)
argument-hint: <file-path|commit-range|all> [--domain <name>] [--full]
---

# Parity Check

Cross-platform parity analysis between the web (React SPA) and mobile (Expo/React Native) clients.

## Procedure

### Step 1: Determine Changed Files

Parse the argument to identify which files to analyze:

- **File path** (e.g., `packages/web/src/services/gameService.ts`): Use that single file as the starting point.
- **Commit range** (e.g., `HEAD~3..HEAD` or a commit SHA): Run `git diff --name-only <range>` to get changed files.
- **`all` or `--full`**: Analyze every domain listed in `domain-map.md`.
- **`--domain <name>`**: Restrict analysis to the named domain (auth, teams, games, bullpen, invites, analytics).

If no argument is given, default to `git diff --name-only HEAD~1..HEAD`.

### Step 2: Map Files to Domains

Use the path patterns from `domain-map.md` to assign each changed file to one or more domains:

| Pattern | Domain |
|---------|--------|
| `**/auth*`, `**/login*`, `**/register*` | auth |
| `**/team*` | teams |
| `**/game*`, `**/pitch*`, `**/lineup*`, `**/atBat*` | games |
| `**/bullpen*` | bullpen |
| `**/invite*` | invites |
| `**/analytics*`, `**/scouting*`, `**/heatMap*`, `**/sprayChart*` | analytics |

If `--domain` was provided, filter to only that domain. Skip any files that don't match a domain (e.g., config files, shared types).

### Step 3: Run 6 Checks Per Domain

For each matched domain, read the canonical files listed in `domain-map.md` and run:

#### A. API Call Coverage

1. Read the web service file(s) and mobile API file(s) for the domain.
2. Extract every HTTP call — look for patterns like `api.get(`, `api.post(`, `api.put(`, `api.patch(`, `api.delete(`, `axios.get(`, `fetch(`, `createAsyncThunk` with fetch calls.
3. Normalize endpoints (strip variable interpolation, e.g., `/games/${id}` → `/games/:id`).
4. Compare the two lists. Flag each endpoint as:
   - **MATCH** — both platforms call it
   - **WEB-ONLY** — only web calls it
   - **MOBILE-ONLY** — only mobile calls it
   - **MISMATCH** — both call it but with different HTTP methods or path prefixes

#### B. Request Payload Parity

For each shared endpoint (MATCH or MISMATCH):
1. Find the request body or query params sent by each platform.
2. Compare field names. Flag missing or extra fields on either side.
3. Note type differences if detectable (e.g., string vs number).

#### C. Response Handling

For each shared endpoint:
1. Check how each platform unwraps the response (e.g., `response.data`, `response.data.game`, destructuring).
2. Flag differences in unwrapping depth or field access.
3. Note if one platform ignores certain response fields the other uses.

#### D. UI Screen Coverage

1. Use Glob to find web pages: `packages/web/src/pages/**/*.tsx` and `packages/web/src/components/<domain>/**/*.tsx`
2. Use Glob to find mobile screens: `packages/mobile/app/**/*.tsx` and `packages/mobile/src/components/<domain>/**/*.tsx`
3. List screens/pages per platform. Flag screens that exist on one platform but not the other.

#### E. Form Field Parity

For create/edit forms in the domain:
1. Find form components on each platform (look for `<input`, `<TextInput`, `<TextField`, `onSubmit`, `handleSubmit`).
2. List the form fields (by field name or label).
3. Compare and flag missing fields on either platform.

#### F. Feature-Specific Checks

Consult the "Feature-Specific Notes" section of `domain-map.md` for the domain. Run any domain-specific checks listed there (e.g., logo upload for teams, pitcher change for games).

### Step 4: Output Report

Format the report as follows:

```
## Parity Check Report

**Scope:** <file/range/all> | **Domains:** <list>

### Summary

| Domain | API Calls | Payloads | Responses | Screens | Forms | Special | Overall |
|--------|-----------|----------|-----------|---------|-------|---------|---------|
| games  | ⚠ 2 gaps  | ✅        | ⚠ 1 diff  | ✅       | ✅     | ⚠ 1     | ⚠       |

### <Domain Name>

#### A. API Call Coverage
| Endpoint | Method | Web | Mobile | Status |
|----------|--------|-----|--------|--------|
| /games/:id | GET | gameService.getGame | gamesApi.fetchGame | MATCH |
| /games/:id/logo | POST | teamService.uploadLogo | — | WEB-ONLY |

#### B–F. <remaining sections as needed>

### Recommendations

| Priority | Domain | Issue | Suggested Action |
|----------|--------|-------|------------------|
| HIGH | games | /games/:id/state called differently | Align endpoint paths |
| MEDIUM | teams | Logo upload missing on mobile | Add if needed or document as intentional |
| LOW | analytics | Scouting notes web-only | Backlog for mobile v2 |
```

**Priority rules:**
- **HIGH**: Different endpoints for the same data, missing CRUD operations that exist on the other platform, payload field mismatches that could cause bugs
- **MEDIUM**: Missing UI screens, missing form fields, response unwrapping differences
- **LOW**: Intentional platform differences (documented in domain-map.md), cosmetic differences

### Notes

- Consult `domain-map.md` (in this skill's directory) for the canonical file mapping and known intentional gaps.
- Known intentional differences (listed in domain-map.md under "Known Intentional Gaps") should be reported as LOW priority with a note that they are intentional.
- If a domain has no counterpart files on one platform, report the entire domain as `<PLATFORM>-ONLY` and skip checks B–E.
