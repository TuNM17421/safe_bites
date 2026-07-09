# Phase 04 — PWA / Turbopack build (`--webpack`) + offline verify

**Depends on:** 02 · **Status:** Not started · **Priority:** P0 (highest risk — offline is a core feature)

## Overview
Next 16 makes **Turbopack the default** for `dev` and `build`. Serwist compiles the service worker with
**Webpack**, so the production build must opt out of Turbopack (`next build --webpack`). Dev can stay on
Turbopack (the SW is disabled in dev anyway). Then verify the PWA actually works offline.

## Key insights
- `next.config.ts` already wraps config with `withSerwist(withNextIntl(...))` and disables the SW in dev
  (`disable: process.env.NODE_ENV === 'development'`). Keep that.
- Serwist 9 supports Turbopack for dev, but the **SW build still needs Webpack** → `next build --webpack`.
- Production deploy runs the build via `apps/web/vercel.json` `buildCommand`
  (`prisma generate && prisma migrate deploy && next build`) — this must become `next build --webpack`.

## Requirements
- Prod build compiles the SW; offline shell + saved data work after a real build+start.

## Implementation steps
1. `apps/web/package.json` scripts:
   - `"dev": "next dev --turbopack"` (optional; SW disabled in dev)
   - `"build": "prisma generate && next build --webpack"` (SW needs Webpack)
2. `apps/web/vercel.json`: change `buildCommand` to
   `prisma generate && prisma migrate deploy && next build --webpack`.
3. If Serwist needs the `@serwist/turbopack` companion for dev, add it per its docs; otherwise leave dev as-is.
4. Build for real (bypass RTK): from `apps/web`, `node ./node_modules/next/dist/bin/next build --webpack`
   with env set. Confirm `public/sw.js` is generated.
5. Offline verification (production build): `next start`, open the app, let the SW register, DevTools →
   Application → Service Workers (activated), go **offline**, reload → offline shell renders; open a saved
   allergy card / dishes → "Available offline" / saved data shows. Do this via headless Chrome + CDP
   (`Network.emulateNetworkConditions offline:true`) or manually.

## Related code files
- Modify: `apps/web/package.json` (scripts), `apps/web/vercel.json` (buildCommand).
- Verify (unchanged source): `apps/web/next.config.ts`, `apps/web/src/lib/service-worker.ts`, `public/sw.js` (generated).

## Todo
- [ ] `build` script uses `--webpack`
- [ ] `vercel.json` buildCommand updated
- [ ] Prod build generates `public/sw.js`
- [ ] Offline verified (SW registered; offline shell + saved data work)

## Success criteria
`next build --webpack` succeeds, `public/sw.js` emitted, offline PWA behavior matches pre-upgrade.

## Risk assessment
- **Highest-risk phase.** If Serwist can't build the SW under Next 16 even with `--webpack`, offline
  breaks — this is a blocker; do not ship. Options: pin Serwist to a known-good Next-16 minor, or halt
  the upgrade and stay on 15.5.
- Losing Turbopack build speed is an accepted trade-off for a working SW.

## Security considerations
- SW scope/precache unchanged; no new network surface. `copy:check` already scans `public/` incl. the SW.

## Next steps
Phase 05 — full verification.
