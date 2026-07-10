# Phase 02 — Route rename, link sweep, removals & demotions

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta (source of truth): [../migration-delta.md](../migration-delta.md) — §0, §3 (removals/demotions)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — restaurant-detail route (`/restaurant/[id]`), profile merge, 5-tab bottom nav
- Current key files (read): `apps/web/src/app/[locale]/(app)/restaurants/[restaurantIdOrSlug]/page.tsx`, `apps/web/src/components/restaurants/restaurant-card.tsx`, `apps/web/src/features/restaurants/restaurant-detail.tsx`, `apps/web/src/components/app-shell/app-header.tsx`, `apps/web/src/components/app-shell/bottom-nav.tsx`, `apps/web/src/components/app-shell/profile-hydrator.tsx`, `apps/web/src/app/[locale]/page.tsx`

## Overview
- **Priority:** High (foundational — later phases route into `/restaurant/[id]` and `/profile`)
- **Current status:** Not started
- **Effort:** M
- **Risk:** med
- **Depends on:** phase-01
- Rename the plural restaurant-detail route to the singular `/restaurant/[id]`, sweep every `@/i18n/navigation` `Link`/`router` href across the repo so nothing dead-links, and demote/remove the cut destinations (`/allergy-card`, `/question-card` as destinations, landing `browseDishes` CTA). This is a mechanical-but-wide change: the whole app links through these routes, so the guardrail is a green typecheck plus e2e specs.

## Key Insights
- **Route param today is `restaurantIdOrSlug`** — `app/[locale]/(app)/restaurants/[restaurantIdOrSlug]/page.tsx` passes it to `RestaurantDetail restaurantIdOrSlug={…}`, which forwards to `fetchRestaurantDetailRec` (`restaurants-client.ts:165`, `…/restaurants/${idOrSlug}`). The **API path stays plural**; only the *page* route + UI Link hrefs change. Keep the slug-or-id capability under the new folder name `restaurant/[id]` (param `id`), so slugs still resolve — do NOT tighten to numeric id.
- **Where `/restaurants/…` detail links are built:** `restaurant-card.tsx:28` `const href = \`/restaurants/${item.slug ?? item.restaurantId}\`` and the back-link in `restaurant-detail.tsx:39` `<Link href="/restaurants">`. These are the load-bearing ones.
- **`app-header.tsx`** renders a persistent `IdCard` quick-action `<Link href="/allergy-card" aria-label={t('nav.allergyCard')}>` (lines 15–21). v2 folds the card into profile → repoint to `/profile`.
- **`restaurant-guide.tsx:109`** and **`dish-guide.tsx:81`** both render an offline `showAllergyCard` CTA `<Link href="/allergy-card">` → repoint to `/profile`.
- **`menu-item-recommendation-card.tsx:53–59`** links `\`/question-card?menuItemId=…\`` and **`dish-detail.tsx:112–118`** links `\`/question-card?dishId=…\``. Per delta §3 we **keep** the question-card API/`buildQuestionCard`/hooks/display but demote the standalone destination — rewire these to a contextual trigger (in-place disclosure / sheet) rather than a route push. Phase-02 scope: neutralize the dead route link; the trigger's final surface can reuse `question-card-screen.tsx` inline.
- **`profile-hydrator.tsx:6`** `PROFILE_REQUIRED = ['/dishes', '/allergy-card', '/question-card']` — all three cut; must be rewritten to the v2 profile-dependent routes (e.g. `/restaurant`, `/famous`, `/ocr`, `/agent` as they land) or emptied for now to avoid redirect loops.
- **`app/[locale]/page.tsx:61–67`** landing renders the `browseDishes` `<Link href="/dishes">` CTA — remove; first-run primary CTA currently `/onboarding`, delta §3 wants first-run → `/login` (placeholder route lands in phase-01/greenfield). Point the primary CTA at `/login` if it exists, else keep `/onboarding` and leave a TODO.
- **`home/page.tsx`** ALSO hard-links `/restaurants`, `/dishes`, `/allergy-card`, `/question-card` (five CTAs). Home is fully rewritten map-first in a later phase; for phase-02 either fix these hrefs or accept they’re superseded — coordinate so home doesn’t dead-link between phases (gotcha).
- **i18n keys** live in `apps/web/messages/{en,vi}.json`: `nav.dishes/restaurants/allergyCard/questionCard`, `landing.browseDishes`, `home.browseDishes/browseRestaurants/showAllergyCard/generateQuestionCard`. Remove keys only once no `t('…')` references remain (grep-gate).
- **`defaultLocale` is still `en`** (`i18n/routing.ts`) — unprefixed URLs resolve to `/en/…`; don’t assume `/vi`.

## Requirements
**Functional**
- `/[locale]/restaurant/[id]` renders the restaurant detail; old `/restaurants/[…]` no longer referenced by any internal Link (optional `302` shim if external/bookmarked links matter — default: no shim, internal-only rename).
- No internal `Link`/`router.replace` targets a removed destination (`/allergy-card`, `/question-card`, landing `/dishes`).
- Allergy-card shortcuts resolve to `/profile`; question-card CTAs become contextual triggers (no route navigation to `/question-card`).
- `PROFILE_REQUIRED` reflects only routes that still exist.

**Non-functional**
- All UI strings via `useTranslations`; no hardcoded copy — add product-approved VI/EN keys for any new trigger labels, reuse existing keys where semantics match.
- Only `@/i18n/navigation` `Link`/`router` (never `next/link`) except the pre-existing admin island.
- Keep touched files <200 lines; DRY the detail-href construction.
- `tsc` clean; e2e happy-paths updated and green.

## Architecture
- **Route move:** filesystem rename `app/[locale]/(app)/restaurants/[restaurantIdOrSlug]/` → `app/[locale]/(app)/restaurant/[id]/`, param `restaurantIdOrSlug` → `id`. The plural list route `(app)/restaurants/page.tsx` (RestaurantGuide) stays for now (its fate is the map-home phase) — only the *detail* segment goes singular; verify no collision.
- **Link data-flow:** `restaurant-card` → `/restaurant/${slug ?? id}` → detail page → `id` param → `fetchRestaurantDetailRec(id)` → unchanged `/api/v1/recommendations/restaurants/{idOrSlug}`.
- **Question-card demotion:** replace the two route-`Link`s with a client trigger that opens the existing `question-card-screen` content inline (disclosure/sheet), passing `menuItemId`/`dishId` as props instead of query string. Keep it thin; reuse `use-question-card`.
- **Removals:** delete dead landing/home CTAs and their now-orphan i18n keys after a grep confirms zero references.

## Related Code Files
**Modify**
- `apps/web/src/components/restaurants/restaurant-card.tsx` — detail href → `/restaurant/…`
- `apps/web/src/features/restaurants/restaurant-detail.tsx` — back link → `/restaurant` list or `/home`; keep API call as-is
- `apps/web/src/components/app-shell/app-header.tsx` — IdCard link → `/profile`
- `apps/web/src/features/restaurants/restaurant-guide.tsx` — offline CTA → `/profile`
- `apps/web/src/features/dishes/dish-guide.tsx` — offline CTA → `/profile`
- `apps/web/src/components/restaurants/menu-item-recommendation-card.tsx` — question-card route → contextual trigger
- `apps/web/src/features/dishes/dish-detail.tsx` — question-card route → contextual trigger; back link retarget
- `apps/web/src/components/app-shell/profile-hydrator.tsx` — rewrite `PROFILE_REQUIRED`
- `apps/web/src/app/[locale]/page.tsx` — remove `browseDishes` CTA; first-run → `/login` (or TODO)
- `apps/web/src/app/[locale]/(app)/home/page.tsx` — fix/retire dead CTAs (coordinate with home-map phase)
- `apps/web/messages/en.json`, `apps/web/messages/vi.json` — prune orphan `nav.*`/`browseDishes` keys; add trigger keys
- `apps/web/src/tests/e2e/restaurant-happy-path.spec.ts`, `…/happy-path.spec.ts` — update route expectations

**Create**
- `apps/web/src/app/[locale]/(app)/restaurant/[id]/page.tsx` (moved from plural segment)
- (optional) a small `question-card-trigger.tsx` client component if inlining warrants extraction

**Delete**
- `apps/web/src/app/[locale]/(app)/restaurants/[restaurantIdOrSlug]/` (after move)
- Standalone `/question-card` and `/allergy-card` *route* pages are demoted here only if fully unreferenced; final deletion coordinated with profile-merge phase (default: leave route files, remove nav/entry links now to avoid orphaning in-flight work)

## Implementation Steps
1. Move the detail route folder to `restaurant/[id]/`, rename the param to `id`, and update `RestaurantDetail` prop name accordingly (keep slug-or-id semantics).
2. Update `restaurant-card.tsx:28` and `restaurant-detail.tsx:39` hrefs to the singular route; factor the href into one helper if reused.
3. Repoint `app-header.tsx`, `restaurant-guide.tsx`, `dish-guide.tsx` allergy-card links → `/profile`.
4. Rewire `menu-item-recommendation-card.tsx` + `dish-detail.tsx` question-card links to a contextual trigger reusing `use-question-card`/`question-card-screen`; add product-approved VI/EN trigger key(s).
5. Remove the landing `browseDishes` CTA; set first-run primary CTA → `/login` if present, else leave `/onboarding` + TODO.
6. Fix or retire the five dead CTAs in `home/page.tsx` (coordinate with the map-home phase owner).
7. Rewrite `PROFILE_REQUIRED` in `profile-hydrator.tsx` to only-existing routes.
8. Grep the repo for `"/restaurants/"`, `/allergy-card`, `/question-card`, `nav.dishes`, `nav.restaurants`, `browseDishes`; resolve every hit.
9. Prune now-orphan i18n keys from `en.json`/`vi.json` (only after grep shows zero `t()` refs).
10. Update e2e specs to the new routes; run typecheck + e2e.

## Todo
- [ ] Move `restaurants/[restaurantIdOrSlug]` → `restaurant/[id]`, param → `id`
- [ ] Sweep detail-href builders (restaurant-card, restaurant-detail back link)
- [ ] Repoint allergy-card links → `/profile` (app-header, restaurant-guide, dish-guide)
- [ ] Contextual question-card triggers (menu-item card, dish-detail)
- [ ] Remove landing `browseDishes` CTA; first-run → `/login`/TODO
- [ ] Fix/retire dead CTAs in `home/page.tsx`
- [ ] Rewrite `PROFILE_REQUIRED`
- [ ] Repo-wide grep sweep; resolve all hits
- [ ] Prune orphan i18n keys (en + vi in lockstep)
- [ ] Update e2e specs; typecheck + tests green

## Success Criteria
- `grep -rn "/restaurants/\|/allergy-card\|/question-card" apps/web/src` returns no internal `Link`/`router` navigation targets (API `/api/v1/...restaurants/...` allowed).
- `pnpm --filter web typecheck` clean; e2e `restaurant-happy-path` + `happy-path` pass on the new route.
- Manual click-through: header IdCard → `/profile`; restaurant card → `/restaurant/[id]`; question-card CTAs open inline (no 404/route push); landing has no browse-dishes button.
- `en.json` and `vi.json` key sets stay identical; no missing-message runtime warnings.

## Risk Assessment
- **Missed href → dead link.** Mitigate: exhaustive grep gate (step 8) + e2e coverage; typecheck catches renamed props.
- **Home page churn collides with map-home phase.** Mitigate: coordinate ownership; if map-home lands same sprint, prefer fixing hrefs minimally here.
- **Deleting i18n keys still referenced elsewhere → runtime `t()` gaps.** Mitigate: grep-gate before pruning; edit en+vi together.
- **Route rename breaks external bookmarks.** Mitigate: internal-only rename by default; add a `302 /restaurants/[…] → /restaurant/[…]` shim only if stakeholders require link stability.

## Security Considerations
- No auth surface change: `(app)` routes stay client-gated by `profile-hydrator`; ensure the rewritten `PROFILE_REQUIRED` doesn’t accidentally expose a profile-dependent route or loop-redirect.
- Zod: no API boundary changes in this phase; the detail API contract is untouched. If the inline question-card trigger calls any endpoint, keep the existing Zod-validated boundary.
- Human-in-the-loop / provenance: unaffected — this phase moves no data and creates nothing verified.
- PII: allergy-card content now reached via `/profile` stays on-device (Dexie); no new network egress introduced.

## Next Steps
- Unblocks the **profile-merge** phase (bilingual card folded into `/profile`, now the canonical allergy-card destination).
- Unblocks the **restaurant-detail v2** phase (%-ring + suit/ask/avoid) which builds on the singular `/restaurant/[id]` route.
- Clears dead links ahead of the **map-home** and **5-tab bottom-nav** phases.
