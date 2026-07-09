# Phase 03 — next-intl v3 → v4 migration

**Depends on:** 02 · **Status:** Not started · **Priority:** P0

## Overview
Migrate next-intl 3.26 → 4.x (required for Next 16). The app already uses the "modern" APIs that v4
standardizes, so churn is small; the work is reconciling any v4 breaking changes and re-testing i18n.

## Key insights
- APIs in use are v4-stable: `defineRouting` (`src/i18n/routing.ts`), `createNavigation`
  (`src/i18n/navigation.ts` → `Link, redirect, usePathname, useRouter, getPathname`), `getRequestConfig`
  (`src/i18n/request.ts`, already returns `locale`), `createMiddleware` (now in `proxy.ts`).
- Follow the **official next-intl v4 migration guide** (link in `docs/NEXT16_MIGRATION.md`). Likely
  touch-points: `NextIntlClientProvider` may need an explicit `locale` prop; formatting/error defaults;
  any removed deprecated exports.
- **House rule stays:** all navigation via `@/i18n/navigation` (never `next/link`); all copy via
  `useTranslations` (no hardcoded strings). Do not regress these during the migration.

## Requirements
- App builds + typechecks on next-intl v4; EN + VI render correctly on every screen.

## Implementation steps
1. Read the next-intl v4 migration guide; apply each applicable change.
2. `src/i18n/request.ts`: ensure it returns `{ locale, messages }` (already does) — v4 requires `locale`.
3. `src/app/[locale]/layout.tsx`: pass `locale` to `<NextIntlClientProvider locale={locale} messages={messages}>`
   if v4 requires it (it no longer infers in some cases). Admin island provider in `app/admin/layout.tsx`
   already passes `locale="en"` — verify it still compiles.
4. `src/i18n/navigation.ts` + `proxy.ts`: confirm `createNavigation` / `createMiddleware` signatures unchanged.
5. Fix any typecheck errors surfaced by the v4 types; run `pnpm --filter @safebite/web typecheck`.
6. Manually spot-check EN and VI on: landing, onboarding, home, dishes, dish detail, restaurants
   (Nearby), restaurant detail, question card, allergy card, profile, offline, admin.

## Related code files
- Modify (as needed): `apps/web/src/i18n/{routing,navigation,request}.ts`, `apps/web/src/app/[locale]/layout.tsx`,
  `apps/web/src/app/admin/layout.tsx`, `apps/web/src/proxy.ts`.
- Messages unchanged: `apps/web/messages/{en,vi}.json` (keep 259/259 parity).

## Todo
- [ ] v4 migration guide applied
- [ ] `NextIntlClientProvider` locale prop reconciled (both providers)
- [ ] typecheck green
- [ ] EN + VI verified on all screens (incl. admin island)

## Success criteria
`pnpm typecheck` green; no missing-message errors; EN/VI correct everywhere; `copy:check` still green.

## Risk assessment
- **Silent locale/format regressions** → the only reliable check is rendering EN and VI on each screen.
- **Provider change** could break the admin fixed-locale island → test `/admin` explicitly.

## Security considerations
- None new (i18n only).

## Next steps
Phase 04 (PWA build) if not already done, then Phase 05 (verify).
