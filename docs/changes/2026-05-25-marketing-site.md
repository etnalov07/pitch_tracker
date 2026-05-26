# 2026-05-25 — Marketing website (new `packages/marketing`)

- **Type:** `feat`
- **Commit:** _pending_
- **Versions:** `@pitch-tracker/marketing` **1.0.0** (new package). No other package versions bumped.

## Context

PitchChart had shipping web (`v1.30.0`) and mobile (`v1.99.0`) apps but no public marketing presence. The iOS bundle (`com.bvolante.pitch-tracker`) is built and ready but not yet listed in the App Store. We needed a responsive, public-facing site to:

- Explain the product to the three core personas (coaches, players, org admins).
- Showcase the six feature pillars (Live Game, Bullpen, Scouting, Performance Reports, Video & Pitch Analysis, Hardware Integration).
- Provide clear CTAs: Sign in (links to existing web app `/login`), App Store badge (placeholder for now), Schedule a demo.
- Work equally on desktop and mobile browsers; on mobile, lead with the App Store badge.
- Be trivial to update once App Store URLs exist — single env-var change.

## Plan (Decisions)

Original plan: [`~/.claude/plans/lets-design-a-website-cuddly-cookie.md`](../../../../.claude/plans/lets-design-a-website-cuddly-cookie.md) (also stored locally with the agent run).

Locked decisions:

- **Location:** new `packages/marketing/` workspace (clean separation from the authenticated app — no auth code shipped to public visitors).
- **Stack:** Vite + React 19 + Emotion + react-router-dom v7 (mirrors `packages/web` versions; team is fluent).
- **Theme:** mirror `packages/web/src/styles/theme.ts` — same navy `#0B1F3A` / accent green `#22c55e` palette and same breakpoints. CSS variables defined in a marketing-local `global.css` (light-mode only for v1).
- **App Store handling:** badges always render. When `VITE_APP_STORE_URL` / `VITE_PLAY_STORE_URL` are empty, render visually-disabled with a "Coming Soon" overlay. One env-var change at launch unlocks the real links.
- **Pages:** 4 routes with shared header/footer — `/`, `/features`, `/pricing`, `/about`.
- **Copy:** centralized in `src/config/content.ts` so copy edits don't require JSX changes.
- **Pricing:** three placeholder tiers (Free / Coach / Team) with editable feature lists; numbers TBD.
- **Contact:** `mailto:brian.volante@bvolante.com` for v1 — no backend form endpoint.

## What shipped

### `packages/marketing/` (new package, version `1.0.0`)

**Bootstrap & configuration**
- Added `package.json` declaring Vite + React 19 + Emotion + react-router-dom v7 dependencies, `dev` / `build` / `preview` / `typecheck` / `format` scripts.
- Added `tsconfig.json` with strict mode, bundler module resolution, and `vite/client` types.
- Added `vite.config.ts` (port 3001, React plugin, SPA build to `dist/`).
- Added `index.html` with full OG / Twitter meta tags, favicon, apple-touch-icon, theme-color.
- Added `.env.example` documenting `VITE_APP_STORE_URL`, `VITE_PLAY_STORE_URL`, `VITE_WEB_APP_URL`, `VITE_CONTACT_EMAIL`.
- Added `README.md` with dev / build / deploy / "swap in real App Store URL" instructions.

**Styles**
- `src/styles/theme.ts` — Emotion theme mirroring web's tokens (colors, spacing, typography, breakpoints, shadows). Adds a marketing-friendly spacing scale (xs–5xl) and a `mq` helper for media queries.
- `src/styles/global.css` — `:root` CSS variables for the brand palette (light mode only), body reset, font stack, smooth scroll.

**Config**
- `src/config/env.ts` — typed wrappers for `import.meta.env`; exposes `signInUrl`, `mailtoUrl`, and `hasAppStoreUrl`/`hasPlayStoreUrl` booleans.
- `src/config/content.ts` — single source of truth for all marketing copy: hero, six feature pillars, three personas, three pricing tiers, FAQ, about paragraphs, nav, footer.

**Shared components (each in its own `<Component>/{Component.tsx,styles.ts,index.ts}` folder)**
- `Container` — max-width 1200px responsive wrapper.
- `Header` — sticky navy gradient header, brand mark + nav (Features/Pricing/About) + Sign-in CTA. Mobile: hamburger drawer.
- `Footer` — navy bottom panel with brand, link columns, contact email, and App Store badges.
- `AppStoreBadge` — Apple + Google badges with inline SVG icons. Renders disabled with "Coming Soon" overlay when env vars are empty; clickable anchor when set. Two distinct styled components (`BadgeAnchor` vs `BadgeBox`) to satisfy strict TypeScript on Emotion's polymorphic `as`.
- `CTAButton` — primary (green fill) / secondary (outline) variants in `md` / `lg` sizes. Uses `styled(Link)` for internal routes and `styled.a` for external URLs (avoids Emotion `as` polymorphism type issues).
- `FeatureCard` — icon + headline + blurb card used in landing-page feature grid.
- `PersonaCard` — gradient card with title, value-prop, and check-marked bullet list.
- `PricingTier` — tier card with optional "Most popular" highlight, feature checklist, and CTA that mailto's for the Team tier and routes to `/login` for the others.
- `SectionHeading` — eyebrow + headline + optional sub, left or center aligned.

**Pages**
- `pages/Landing/` — hero (eyebrow + headline + subhead + dual CTAs + App Store badges + hero screenshot), feature pillars grid (1/2/3 cols responsive), personas section (1/3 cols), final CTA strip with App Store badges.
- `pages/Features/` — page hero + six alternating left/right feature sections with detailed bullets and screenshot mockups.
- `pages/Pricing/` — page hero + three pricing tiers + FAQ accordion (defaults to first item open).
- `pages/About/` — page hero + product story paragraphs + dark navy contact-CTA panel that mailto's the contact email.

**Routing**
- `src/main.tsx` — React 19 root, `BrowserRouter`, imports global CSS.
- `src/App.tsx` — `ScrollToTop` helper, header + `<main>` + footer wrapper, routes for `/`, `/features`, `/pricing`, `/about`, fallback to Landing.

**Public assets**
- Copied `favicon.png`, `logo.png`, `logo192.png`, `logo512.png` from `packages/web/public/`.
- Placeholder screenshots in `public/screenshots/{live-game,bullpen,scouting,report}.png` (copies of `logo512.png` until real captures land).
- Placeholder `public/og-image.png` (also a logo copy).
- `public/robots.txt` allowing all crawlers.

### Root

- Updated root `package.json` `workspaces` array to include `packages/marketing`.
- Added `dev:marketing` and `build:marketing` scripts to root `package.json`.

## Verification

- `npm install` from root completes; marketing has its own `node_modules` for Vite/plugin-react; React/Emotion are hoisted.
- `npx tsc -p packages/marketing/tsconfig.json --noEmit` — no errors.
- `npm run build --workspace=@pitch-tracker/marketing` — builds to `packages/marketing/dist/` (HTML 1.84 KB, CSS 2.04 KB, JS 295 KB / 94 KB gzipped).
- `npm run dev:marketing` from root — serves at `http://localhost:3001`; smoke test confirms HTML 200 with full meta tags.
- Manual checks to run:
    - Visit `/`, `/features`, `/pricing`, `/about` — header/footer consistent, in-app nav works.
    - Resize to 375 × 667 — hero stacks, hamburger nav functional, App Store badge visible above fold, feature grid 1-col.
    - Resize to 1280 × 800 — feature grid 3-col, hero side-by-side.
    - With empty env: App Store badge shows "Coming Soon" overlay and is not clickable.
    - With `VITE_APP_STORE_URL=https://apps.apple.com/...` in `.env.local`, restart dev — badge becomes a clickable anchor opening the URL in a new tab.

## Out of scope (deferred)

- Real App Store / Play Store URLs (placeholder env vars; populate at launch).
- Backend contact-form endpoint (using `mailto:` for v1).
- Analytics (GA, Plausible, etc.).
- Blog or docs section.
- CMS — copy lives in `src/config/content.ts`.
- Hosting + CI/CD automation (target TBD).
- Real product screenshots (placeholders ship now).
- Internationalization.
- Marketing-site auth (intentional — fully public).
- A11y audit beyond semantic HTML + alt text + focus styles.
- SEO sitemap.xml beyond defaults.
- Light/dark mode toggle (light only for v1).
