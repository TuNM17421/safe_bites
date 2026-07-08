# Phase 07 — Public restaurant UI

**Context:** Spec §4, §13, §14 · patterns from `features/dishes/*` (dish-guide/card/detail/filter-bar), `components/status/*` (StatusBadge/ConfidenceBadge/SourceBadge), `components/common/state-view.tsx`, `app/[locale]/(app)/*`, `components/app-shell/bottom-nav.tsx`, `messages/{en,vi}.json`, `@/i18n/navigation`.

## Overview
- **Priority:** P0.
- **Status:** Not started.
- Restaurant list + detail pages, cards, badges, filter bar, nav + home wiring, EN/VI copy. RSC wrapper → client feature. Reuse status tokens/components. (Location/map/offline/question-card in Phase 08.)

## Key insights (verified)
- Public routes are RSC wrappers (`await params` + `setRequestLocale`) mounting client features under `src/features/*`. Restaurants belong in the `(app)` route group (shell = header + bottom nav + offline banner).
- Navigation must use `@/i18n/navigation` `Link` (not `next/link`). All copy via `useTranslations` (no hardcoded strings). Status via `sb-status-*` tokens + text labels (no color-only).
- Bottom nav is a `TABS` array with `grid-cols-5` — adding Restaurants ⇒ 6th tab + `grid-cols-6`. Home has a **disabled** `restaurantSearchComingLater` button to flip into a real Link.

## Routes
- `app/[locale]/(app)/restaurants/page.tsx` (RSC → `<RestaurantGuide/>`).
- `app/[locale]/(app)/restaurants/[restaurantIdOrSlug]/page.tsx` (RSC → `<RestaurantDetail/>`).

## Requirements
1. **List page (§4.4)** UI states: no-profile, profile-loaded, location-loading, location-denied, empty, error, offline. Controls: search, city (default Hanoi), district (Hoàn Kiếm/Ba Đình/Tây Hồ/Other), cuisine (if data), sort (recommended/distance/last checked/name), list/map toggle (map shell stubbed in Phase 08). Fetch via TanStack Query POST to `/api/v1/recommendations/restaurants` with active profile from Zustand store (or GET browse when no profile).
2. **RestaurantCard (§4.4)**: name, cuisine, district/address, distance (if available), readiness class A–E, confidence, counts (Suitable/Ask First/Risky/Avoid/Unknown), verification status, menu status, source label, last checked, short reason, "View details" CTA. Discovery-only ⇒ C + "Menu allergy data not available yet" + "Discovery data only".
3. **Detail page (§4.5)** sections: header, source/verification summary, readiness panel, safety caveat, menu items grouped by status, metadata (phone/website/hours), location panel/external map link, question-card CTA. **MenuItemRecommendationCard**: raw name, EN/VI name, matched dish, status, risk level, confidence, reason, action, source, last verified, shared cookware/fryer notes, customization notes, "Ask about this item" CTA.
4. **i18n (§13)**: add namespaces `restaurants`, `restaurantDetail`, `restaurantCard`, `menuItemCard`, `locationPermission` to `messages/en.json` + `vi.json`. Data display uses name_vi/name_en, falls back to canonical/raw.

## Components (§14)
Create: `RestaurantCard`, `RestaurantReadinessBadge`, `RestaurantSourceBadge`, `RestaurantVerificationBadge`, `RestaurantMenuStatusBadge`, `RestaurantDistanceLabel`, `RestaurantFilterBar`, `RestaurantListEmptyState`, `MenuItemRecommendationCard`, `MenuItemStatusBadge`. Reuse existing `StatusBadge`/`ConfidenceBadge`/`SourceBadge`/`state-view`/`skeleton-card` where they fit.

## Related code files
- Create: `app/[locale]/(app)/restaurants/page.tsx`, `.../[restaurantIdOrSlug]/page.tsx`; `features/restaurants/*` (guide, card, detail, filter-bar, hooks `use-restaurant-recommendations.ts`); `components/restaurants/*` (badges).
- Modify: `components/app-shell/bottom-nav.tsx` (+tab, grid-cols-6), `app/[locale]/(app)/home/page.tsx` (flip CTA, add "Browse restaurants"), `messages/{en,vi}.json` (+nav.restaurants + namespaces).

## Implementation steps
1. Add i18n messages (EN+VI), nav.restaurants, home CTA strings — denylist-safe.
2. Add 6th nav tab + grid-cols-6.
3. Build badges + RestaurantCard + FilterBar + EmptyState.
4. Build RestaurantGuide list feature (query, states, sort/filter).
5. Build RestaurantDetail + MenuItemRecommendationCard (grouped by status, strictness order).
6. Flip home CTA to real Links.

## Todo
- [ ] i18n namespaces EN+VI + nav + home CTA
- [ ] Bottom nav 6th tab
- [ ] Badges + RestaurantCard + FilterBar + EmptyState
- [ ] List feature (all UI states)
- [ ] Detail + MenuItemRecommendationCard
- [ ] Home CTA wired

## Success criteria
`/restaurants` works without location; cards show readiness/source/verification/counts; detail shows menu recommendations with status/reason/source/confidence/last-checked; Suitable shows confirm-with-staff caveat; discovery-only shows C/uncertain; EN+VI; accessible (text labels, keyboard, no color-only).

## Risks
- One-hand mobile layout with 6 tabs → verify touch targets ≥44px, keep icons+labels tight.

## Security
Active profile from client state, posted in body; never in URL. All copy denylist-safe.

## Next
Phase 08 adds location/map/offline/question-card behaviors on top.
