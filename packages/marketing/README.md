# @pitch-tracker/marketing

Public marketing site for PitchChart. Vite + React 19 + Emotion + React Router v7.

## Dev

```bash
cd packages/marketing
npm install      # or `npm install` from the monorepo root
npm run dev      # → http://localhost:3001
```

Copy `.env.example` to `.env.local` to override defaults (App Store URLs, web app URL, contact email).

## Build

```bash
npm run build    # → packages/marketing/dist/
npm run preview  # serve the built bundle locally
```

## Editing copy

All marketing copy (headlines, feature blurbs, pricing tiers, personas) lives in `src/config/content.ts`. Edit that single file — no JSX changes needed for text updates.

## App Store URLs

When the iOS / Android listings go live, set the URLs:

```bash
# .env.local (dev) or hosting provider env (prod)
VITE_APP_STORE_URL=https://apps.apple.com/app/idXXXXXXXXXX
VITE_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.bvolante.pitch_tracker
```

Rebuild. Badges become clickable; "Coming Soon" overlay disappears.

## Deploy

Static SPA — deploy `dist/` to any static host (Vercel, Netlify, S3 + CloudFront, etc.). Configure SPA fallback so `/features`, `/pricing`, `/about` all serve `index.html`.

Hosting choice is TBD — wire up CI when target is decided.
