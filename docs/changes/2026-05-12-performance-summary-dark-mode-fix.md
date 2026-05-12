# Fix: PerformanceSummaryCard "by zone" panel — dark mode visibility

| Date       | Type | Commit    | Versions          |
| ---------- | ---- | --------- | ----------------- |
| 2026-05-12 | fix  | `094a7af` | web 1.0.0 → 1.0.1 |

## Context

The "What worked / what got hit (by zone)" section inside
`PerformanceSummaryCard` used hardcoded light-mode hex colors as **inline
React styles**. Inline styles bypass the CSS-variable theming system, so
the panel rendered with light-gray surface + dark-green "Worked best" label
in dark mode — nearly invisible against the dark page background.

Identified by inspecting a live performance summary in dark mode via
Chrome DevTools.

## Decisions

Swap the four hardcoded hex values for CSS variables already defined for
both light and dark mode in `packages/web/src/index.css`:

| Style                     | Before    | After                     |
| ------------------------- | --------- | ------------------------- |
| Card border               | `#e5e7eb` | `var(--surface-border)`   |
| Card background           | `#f9fafb` | `var(--surface-elevated)` |
| "Worked best" label color | `#166534` | `var(--color-green-500)`  |
| "Got hit" label color     | `#dc2626` | `var(--accent-red)`       |

Other hardcoded values in this file (the `RESULT_COLOR` map at the top,
pitch-result chips) are intentionally semantic — they color the per-pitch
result chips and read fine in both themes against the chip background.
Left alone.

The muted gray `#9ca3af` for the `—` / "None — clean" placeholders is
also unchanged — it's a neutral medium gray that works in both themes.

## What shipped

### packages/web

- `src/components/performanceSummary/PerformanceSummaryCard/PerformanceSummaryCard.tsx`
  — four inline-style values swapped to CSS variables on the "by zone"
  pitch-type breakdown card (around lines 380–415).
- `package.json` — version 1.0.0 → 1.0.1.

## Verification

- [x] Prettier clean on changed file.
- [x] `npx eslint src/components/performanceSummary/...` clean.
- [x] `npx tsc --noEmit` clean.
- [ ] Reload performance summary page in **dark mode** — card surface and
      label colors now have correct contrast.
- [ ] Reload in **light mode** — appearance unchanged from before.

## Out of scope

- Migrating `RESULT_COLOR` chip colors to CSS variables. Chips have their
  own background and the current colors are theme-agnostic by design.
- Auditing the rest of the codebase for other hardcoded-color inline
  styles. Worth a follow-up scan but not part of this fix.
