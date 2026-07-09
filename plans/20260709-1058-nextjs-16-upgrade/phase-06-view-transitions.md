# Phase 06 — Enable View Transitions (cross-fade + shared-element morph)

**Depends on:** 05 (must be fully green) · **Status:** Not started · **Priority:** P1 (the goal of the upgrade)

## Overview
Turn on real View Transitions now that Next 16 provides React's `<ViewTransition>`: a cross-fade on
every navigation plus a shared-element **morph** from a dish list card to the dish detail. Retire the
Next-15 CSS fade fallback so they don't double-animate.

## Key insights (verified on Next 16 docs)
- Enable `experimental: { viewTransition: true }` in `next.config.ts`. The flag alone does **not**
  auto-animate — you must wrap content in React's `<ViewTransition>` (`import { ViewTransition } from 'react'`).
  This import is the reason we upgraded (it did **not** exist in Next 15.5's react — confirmed empty).
- Route navigations are React Transitions, so a `<ViewTransition>` wrapping the swapping `{children}`
  cross-fades automatically. Shared-element morph = same `name` on both the source and target element.
- `next-view-transitions` is NOT usable here (its own `<Link>` conflicts with next-intl) — use React's
  component directly.
- The app already has `(app)/template.tsx` with a CSS `animate-sb-page-enter` fade (from Next 15). It
  will double-animate with VT → remove it (or gate the CSS behind `@supports not (view-transition-name: none)`).

## Requirements
- Cross-fade on in-app navigation; dish list→detail morph; `prefers-reduced-motion` respected; graceful
  no-op on unsupported browsers (Firefox).

## Implementation steps
1. `next.config.ts`: add `experimental: { viewTransition: true }`.
2. Cross-fade: in `apps/web/src/app/[locale]/(app)/layout.tsx`, wrap the page slot:
   `<main …><ViewTransition>{children}</ViewTransition></main>`. Put the ViewTransition in the **layout**
   (persists across nav) so its children swap → default cross-fade. Remove the CSS fade: delete
   `(app)/template.tsx` (or strip `animate-sb-page-enter`); optionally drop the now-unused
   `sb-page-enter` keyframes/animation from `tailwind.safebite-preset.ts`.
3. Shared-element morph (dish list → detail). To stay perf-safe (docs warn against naming long lists
   broadly), name the dish title in both places with a matching `name`:
   - `components/safety/recommendation-card.tsx`: accept an optional `morphName?: string`; when set,
     wrap the `<h3>` title in `<ViewTransition name={morphName}>`.
   - `features/dishes/dish-card.tsx`: pass `morphName={`dish-title-${card.dishId}`}` (the list already
     renders one card per dish → each name unique).
   - `features/dishes/dish-detail.tsx`: wrap the appbar `<h1>` (dish name) in
     `<ViewTransition name={`dish-title-${dishId}`}>`. **Only one** element per page may carry a given
     name — ensure the detail's RecommendationCard does NOT also set `morphName` (leave it unset there).
4. CSS tuning + reduced motion in `apps/web/src/app/globals.css` (or tokens):
   ```css
   ::view-transition-old(root), ::view-transition-new(root) {
     animation-duration: 300ms; animation-timing-function: cubic-bezier(0.05,0.7,0.1,1);
   }
   @media (prefers-reduced-motion: reduce) {
     ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) {
       animation-duration: 0s !important; animation-delay: 0s !important;
     }
   }
   ```
5. (Optional, later) directional slides via `<Link transitionTypes={…}>` and Suspense-reveal for
   skeleton→content — out of scope for the first pass; note as a follow-up.

## Related code files
- Modify: `apps/web/next.config.ts`, `apps/web/src/app/[locale]/(app)/layout.tsx`,
  `apps/web/src/app/globals.css`, `components/safety/recommendation-card.tsx`,
  `features/dishes/dish-card.tsx`, `features/dishes/dish-detail.tsx`.
- Remove/strip: `apps/web/src/app/[locale]/(app)/template.tsx`, `sb-page-enter` in `tailwind.safebite-preset.ts`.

## Todo
- [ ] `experimental.viewTransition` on; `import { ViewTransition } from 'react'` compiles + types resolve
- [ ] Cross-fade on in-app navigation (verified via CDP: `document.startViewTransition` called on nav)
- [ ] Dish list→detail title morph works; no duplicate view-transition-name per page
- [ ] `prefers-reduced-motion` → instant swap (no animation)
- [ ] CSS fallback (`template.tsx` / `sb-page-enter`) removed → no double animation
- [ ] Graceful on Firefox (instant, no errors)

## Success criteria
Smooth cross-fade on tab/detail navigation + a title morph into dish detail; reduced-motion honored;
no regressions from Phase 05; degrades cleanly where unsupported.

## Risk assessment
- **`<ViewTransition>` export/typing.** If `import { ViewTransition } from 'react'` still doesn't resolve
  after the upgrade, VT via React isn't ready — keep the CSS fade and stop here (report). Verify FIRST
  with a trivial wrap before doing the morph work.
- **Name collisions** (two elements sharing a `view-transition-name` in one state) break the transition —
  keep exactly one per name per page.

## Security considerations
- None (presentational only).

## Next steps
Phase — docs to reality: update `docs/NEXT16_MIGRATION.md` status → Done, `docs/deployment.md` build note,
`docs/design/README.md` (VT now live), and the plan statuses.
