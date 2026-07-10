# Phase 01 — Nav + Shell Restructure (5 tabs, gating, route scaffolds)

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta: [../migration-delta.md](../migration-delta.md) — §0 (nav 4→5), §1 (screen mapping), §3 (removals / `PROFILE_REQUIRED` rewrite)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — bottom nav (Bản đồ · Trợ lý · OCR · Nổi tiếng · Hồ sơ) and map-first home
- Current files read:
  - `apps/web/src/components/app-shell/bottom-nav.tsx`
  - `apps/web/src/components/app-shell/profile-hydrator.tsx`
  - `apps/web/src/app/[locale]/(app)/layout.tsx`
  - `apps/web/messages/en.json`, `apps/web/messages/vi.json` (`nav` block, lines 39–46)

## Overview
- **Priority:** High (foundation — every later phase routes through this shell)
- **Current status:** Not started
- **Effort:** M
- **Risk:** Medium
- **Depends on:** none
- Reshape the mobile app shell from the v1 4-tab model (Home · Dishes · Restaurants · Profile) to the v2 5-tab model (Map · Agent · OCR · Famous · Profile), fix the profile-gating list, give the map home a full-bleed padding opt-out, and scaffold empty route folders so subsequent phases each have a landing spot. No new screen logic ships here — scaffolds render a minimal placeholder only.

## Key Insights
- **`bottom-nav.tsx` is a self-contained client component.** `TABS` is a `const` array of `{ href, key, Icon }` (lines 10–15) driving a `.map`. The `<nav>` uses `grid grid-cols-4` (line 21). It already imports Lucide icons, `useTranslations('nav')`, and `Link`/`usePathname` from `@/i18n/navigation` — reuse verbatim, only change the `TABS` data, the grid column count, and the icon set. Active state = `pathname === href || pathname.startsWith(\`${href}/\`)`.
- **`profile-hydrator.tsx`** hydrates Dexie into `useProfileStore` and redirects `PROFILE_REQUIRED = ['/dishes','/allergy-card','/question-card']` (line 6) to `/onboarding` when hydrated with no profile. All three v1 routes are demoted in v2 (delta §3) — this array must be rewritten to the v2 profile-dependent routes. The redirect target `/onboarding` stays.
- **`(app)/layout.tsx`** wraps children in `<main className="flex-1 px-4 py-4">` inside a `max-w-md` column (lines 20, 24). The v2 map home needs full-bleed (no `px-4 py-4`, no `max-w-md`), so the layout needs a per-route opt-out. There is no route-context hook here today; simplest reuse is a small client wrapper that reads `usePathname()` and drops the padding classes for `/home`.
- **i18n `nav` block** currently has `home/dishes/restaurants/allergyCard/questionCard/profile` in both `en.json` and `vi.json`. VI values already exist (`Trang chủ`, `Hồ sơ`, …). Need new keys `map/agent/ocr/famous`; `profile` is reusable.
- **Route layout:** `[locale]/layout.tsx` is the locale root; `[locale]/(app)/layout.tsx` is the in-app shell. `/login` must live **outside** `(app)` (no bottom nav / gating) — create `[locale]/login/`. In-app scaffolds go under `[locale]/(app)/`.
- **Gotchas:** icon collision — v1 uses `MapPin` for Restaurants; v2 wants a distinct **Map** icon for the map tab (use `Map` from Lucide, keep `MapPin` for pins later). Do not touch `next/link` — the admin island is the only sanctioned exception; everything here already uses `@/i18n/navigation`.

## Requirements
**Functional**
- Bottom nav shows exactly 5 destinations in order: Map(`/home`) · Agent(`/agent`) · OCR(`/ocr`) · Famous(`/famous`) · Profile(`/profile`), each with its own icon and localized label.
- Active-tab highlighting still works for each tab and its subpaths.
- Profile gating redirects only v2 profile-dependent routes to `/onboarding`; the removed v1 routes are no longer gated.
- `/home` renders full-bleed (no horizontal padding, no `max-w-md`); all other in-app routes keep the current padded `max-w-md` column.
- New route folders resolve to a placeholder page (no 404) for: `/agent`, `/ocr`, `/famous`, `/restaurant/[id]`, `/restaurant/[id]/dish`, and `/login`.

**Non-functional**
- No hardcoded UI strings — every label via `useTranslations`. VI + EN keys added (product-approved copy).
- Only semantic `sb-*` tokens; reuse existing nav class strings.
- RSC-first: scaffold `page.tsx` files are server components; only nav/gating/padding wrapper stay client. Each file < 200 lines.
- `@/i18n/navigation` for all links/router; no `next/link`.

## Architecture
- **BottomNav (client):** unchanged structure; `TABS` → 5 entries with Lucide `Map, MessageCircle/Bot, ScanLine, Star, CircleUser`; `grid-cols-4` → `grid-cols-5`. Labels from `t('map'|'agent'|'ocr'|'famous'|'profile')`.
- **ProfileHydrator (client):** `PROFILE_REQUIRED` rewritten to v2 profile-dependent routes (e.g. `['/famous','/agent','/ocr']` per delta — confirm final set against phase specs; keep the demoted v1 routes out).
- **Padding opt-out:** introduce a tiny client component (e.g. `app-shell/app-main.tsx`) that reads `usePathname()` and applies `flex-1` always, plus `px-4 py-4` only when the route is not the map home; `(app)/layout.tsx` renders `<AppMain>` around `<ViewTransition>{children}</ViewTransition>`. `max-w-md` opt-out for `/home` handled in the same wrapper (drop the outer `max-w-md` for map, or render map page edge-to-edge within a full-width main).
- **Route scaffolds:** each new folder gets a minimal `page.tsx` returning a titled placeholder using a shared i18n key; screens filled in later phases.
- **Data flow:** no data-model or API changes in this phase.

## Related Code Files
**Modify**
- `apps/web/src/components/app-shell/bottom-nav.tsx` — `TABS`, `grid-cols-5`, icons
- `apps/web/src/components/app-shell/profile-hydrator.tsx` — `PROFILE_REQUIRED`
- `apps/web/src/app/[locale]/(app)/layout.tsx` — wrap children in padding opt-out wrapper
- `apps/web/messages/en.json` — `nav.map/agent/ocr/famous` (+ scaffold placeholder key)
- `apps/web/messages/vi.json` — same keys, VI copy

**Create**
- `apps/web/src/components/app-shell/app-main.tsx` — client padding/width opt-out wrapper
- `apps/web/src/app/[locale]/(app)/agent/page.tsx`
- `apps/web/src/app/[locale]/(app)/ocr/page.tsx`
- `apps/web/src/app/[locale]/(app)/famous/page.tsx`
- `apps/web/src/app/[locale]/(app)/restaurant/[id]/page.tsx`
- `apps/web/src/app/[locale]/(app)/restaurant/[id]/dish/page.tsx`
- `apps/web/src/app/[locale]/login/page.tsx`

**Delete**
- none this phase (v1 route removals handled in their owning phases)

## Implementation Steps
1. In `bottom-nav.tsx`, replace `TABS` with the 5 v2 destinations (`/home`→Map, `/agent`, `/ocr`, `/famous`, `/profile`), import a distinct `Map` icon (keep others), and change `grid-cols-4` → `grid-cols-5`. Update the icon imports; drop now-unused `House`/`UtensilsCrossed`/`MapPin` if not reused.
2. Add product-approved VI/EN `nav.map`, `nav.agent`, `nav.ocr`, `nav.famous` keys to both `messages/en.json` and `messages/vi.json` (reuse existing `nav.profile`). Do not invent copy — use stakeholder-approved labels (Bản đồ / Trợ lý / OCR / Nổi tiếng / Hồ sơ).
3. Rewrite `PROFILE_REQUIRED` in `profile-hydrator.tsx` to the v2 profile-dependent route set; keep the `/onboarding` redirect and the hydrate effect untouched.
4. Create `app-shell/app-main.tsx` (client): `usePathname()`; render `<main>` with `flex-1` always and `px-4 py-4` only when not on `/home`; expose full-width for the map route.
5. Update `(app)/layout.tsx` to render `<AppMain>` in place of the hardcoded `<main className="flex-1 px-4 py-4">`, keeping `<ViewTransition>` inside; adjust `max-w-md` handling so the map home can go edge-to-edge.
6. Add a shared scaffold placeholder i18n key (e.g. `scaffold.comingSoon`) in both message files.
7. Create each new `page.tsx` scaffold as an RSC returning a minimal titled placeholder via `useTranslations`/`getTranslations`; include `setRequestLocale` where the pattern requires. `/login` lives outside `(app)` so it has no bottom nav.
8. Run typecheck/lint and start the dev server; click through all 5 tabs and each scaffold route in both locales.

## Todo
- [ ] `bottom-nav.tsx`: 5-tab `TABS`, distinct Map icon, `grid-cols-5`
- [ ] `en.json` + `vi.json`: add `nav.map/agent/ocr/famous` (product-approved copy)
- [ ] `profile-hydrator.tsx`: rewrite `PROFILE_REQUIRED` to v2 routes
- [ ] `app-main.tsx`: padding/width opt-out wrapper
- [ ] `(app)/layout.tsx`: use `<AppMain>`, allow `/home` full-bleed
- [ ] Scaffold `scaffold.comingSoon` i18n key
- [ ] Scaffold pages: `/agent`, `/ocr`, `/famous`, `/restaurant/[id]`, `/restaurant/[id]/dish`, `/login`
- [ ] Typecheck/lint pass; manual click-through in VI + EN

## Success Criteria
- Bottom nav renders 5 evenly spaced tabs with distinct icons and localized labels in both VI and EN; active highlighting works per tab.
- Navigating to `/agent`, `/ocr`, `/famous`, `/restaurant/[id]`, `/restaurant/[id]/dish`, `/login` returns a placeholder (no 404); `/login` shows no bottom nav.
- `/home` renders full-bleed (no `px-4 py-4`, no `max-w-md`); a padded route (e.g. `/profile`) is visually unchanged from v1.
- Removed v1 routes are no longer in `PROFILE_REQUIRED`; a no-profile user hitting a v2 gated route still redirects to `/onboarding`.
- `pnpm typecheck` / lint clean; no missing-i18n-key runtime warnings in either locale.

## Risk Assessment
- **Missing i18n key crash** if a `nav.*` key is added to only one locale → add all four keys to both `en.json` and `vi.json` in the same step; verify both locales.
- **Padding opt-out over-scopes** and breaks other routes → gate the opt-out to an explicit `/home` check, default to padded.
- **Wrong `PROFILE_REQUIRED` set** could over- or under-gate → confirm the final v2 route list against the phases that own `/agent`, `/ocr`, `/famous` before locking; err toward not gating scaffolds that render without a profile.
- **Icon ambiguity** (Map vs MapPin) → reserve `Map` for the nav tab, `MapPin` for future pins.

## Security Considerations
- No auth/authz change; `/login` is a scaffold only (real WebAuthn/biometric deferred — delta §2, decision 1). No credentials handled yet.
- No API boundaries added, so no new Zod schemas required this phase; scaffolds accept no untrusted input.
- Profile data remains device-only (Dexie/`useProfileStore`); no PII leaves the client. Scaffolds must not log or transmit profile state.
- Human-in-the-loop unaffected: no data is created or verified here.

## Next Steps
- Unblocks: Phase for map-first `/home` (MapLibre + bottom sheet + CompatRing), `/agent` chat, `/ocr` scanner, `/famous`, and singular `/restaurant/[id]` + `/dish` detail — each now has a resolvable route home.
- Feeds the v1-route removal phases (`/dishes`, `/allergy-card`, `/restaurants`) which depend on the new nav no longer referencing them.
