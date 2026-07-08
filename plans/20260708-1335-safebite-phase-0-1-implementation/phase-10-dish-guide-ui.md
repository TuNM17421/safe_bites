# Phase 10 — Dish Guide UI (`/dishes`, `/dishes/[dishId]`)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §9.4 Dishes API (`GET /dishes`, `GET /dishes/{dishId}`), §9.5 Dish recommendations (`POST /recommendations/dishes`)
  - §12.4 `/dishes` acceptance + empty/error/offline states, §12.5 `/dishes/[dishId]`
  - §13 Components + status visual priority (Avoid > Risky > Ask First > Unknown > Suitable) + Suitable caveat copy
  - §7 domain types (`DishRecommendationCard`), §8.1 status severity order, §8.4 confidence buckets
  - §10 client storage (`savedDishes` Dexie table), §11.2 "Recommendation API: do not blindly cache", §19 P1-05 acceptance
- Sibling phase files (dependencies — align to their actual filenames in this plan dir):
  - **phase-06** — dishes & recommendations API routes (provides the endpoints this UI calls)
  - **phase-08** — offline storage + local profile store (provides Dexie `savedDishes`/`profiles` + active-profile hook + online-status hook)
  - **phase-09** — app shell / next-intl / PWA / semantic theme (provides `SafetyNotice`, `OfflineBanner`, `@/i18n/navigation`, status message keys, semantic status tokens)
- Kit: not directly consumed here. Relevant only as the origin of allergen-coverage gaps (treenut/soy → `unknown`) surfaced by phase-06; this UI must render Unknown honestly.

## Overview

- **Priority:** High (P1-05 — a core Phase-1 user flow).
- **Current status:** ✅ Done — verified 2026-07-08 (typecheck/lint/production build; `/dishes` + `/dishes/[dishId]` SSR-render 200; no forbidden copy, no raw hex — built to **design system v2** `sb-*` tokens + lucide icons per the integration guide). Built: `status-visuals` (display order + group-key map), `StatusBadge`/`ConfidenceMeter`/`SourceBadge`, reusable `RecommendationCard` (Suitable caveat baked in), `LanguageToggle` (data-lang, not URL locale), `dishes-client` (Zod-parsed POST/GET), `use-dish-recommendations` (TanStack Query + Dexie persist + offline hydrate), `DishGuide` container (all state branches: no-profile/loading/error/not-seeded/offline-no-saved/grouped), `DishFilterBar`/`DishGroupList`/`DishCard`, `DishDetail` (names EN/VI, ingredients, per-profile risk block, question-card CTA), and `dishes.*` i18n keys. Groups render in visual priority Avoid>Risky>Ask First>Unknown>Suitable. **Notes:** (1) recommendation API grouping (incl. soy→unknown, never suitable) was verified end-to-end in phase 06; (2) DB is now **Neon** (ADR-008) — seeded (14 allergens, 6 templates, 29 dishes) but dishes are `needs_review`, so `/dishes` shows the "not seeded / empty" state until an admin approves them (phase 12); (3) the interactive browser render of grouped cards with a saved profile is exercised by the phase-13 Playwright happy path.
- **Brief description:** Build the two dish-guide screens. `/dishes` fetches per-profile recommendations via TanStack Query (`POST /api/v1/recommendations/dishes` with the active local profile), groups the returned cards by status in visual-priority order, and renders each card with status/confidence/reason/action/source/last-checked. `/dishes/[dishId]` shows dish detail (names, description, common + hidden ingredients) plus the risk block for the active profile. Includes EN/VI data toggle, always-on safety reminder, Suitable caveat, and empty/error/offline states. Consumes API + stores from phases 6/8/9; adds no new endpoints.

## Design System v2 — visual spec (ADR-UI-01/02/03 approved & wired · READ FIRST)

Build this UI to the verified design system. Infra is already applied: `@import './tokens.safebite.css'` in
`globals.css`, `presets:[safebite]` in `tailwind.config.ts`, `lucide-react` in `package.json` (run `pnpm install`).

- **Tokens — use `sb-*`, no raw hex, no legacy single-value `status-*` in NEW files.** Surfaces
  `bg-sb-surface`/`-surface-2`/`-surface-3`; text `text-sb-fg`/`text-sb-muted`/`text-sb-faint`; `border-sb-border`;
  elevation `shadow-sb-e1..e4`; radius `rounded-sb-md`/`-lg`; focus `focus-visible:shadow-sb-focus`.
- **Status trio + icons:** `text-sb-status-<s>-fg bg-sb-status-<s>-bg border-sb-status-<s>-border`
  (`<s> ∈ suitable|ask-first|risky|avoid|unknown`). Glyphs via `lucide-react`:
  CircleCheck / MessageCircleQuestion / TriangleAlert / OctagonX / CircleHelp. Status = icon + label + colour.
  **Confidence is hue-neutral** (grey segments + word), never a ladder hue, never a %.
- **Components (ready-to-paste in `reports/ui-ux-design-integration-guide.md` §3):** `StatusBadge`,
  `ConfidenceMeter`, `SourceBadge`, `RecommendationCard` (Suitable caveat baked in), `LanguageToggle`.
  Loading → `@/components/common/skeleton-card`; empty/error/offline-no-saved → `@/components/common/state-view`.
- **Mockup:** `visuals/safebite-ui-ux-mockups.html` → "Main flow · Dish guide" + "Foundations".
- **Supersedes** the "To modify → add `status-*` tokens" note below: those tokens now come from the preset — do **not** add single-value `status-*`. Tick `reports/ui-ux-progress-tracker.md` (§B/§C) as you build.

## Key Insights

- **This is a client feature, not RSC.** The recommendation call is `POST` because the profile lives only on-device (§9.5). The active profile comes from Dexie/Zustand (phase-08), so the data fetch must run in a `'use client'` component. The route `page.tsx` stays a thin server shell; all interactivity lives in a client container.
- **`DishRecommendationCard` is already UI-ready (§7).** `confidence` arrives as a bucket string `"low"|"medium"|"high"` and `reason`/`action`/`name` arrive as `Record<'en'|'vi',string>`. No raw Prisma `Decimal` reaches this layer — phase-06 mappers guarantee that (cross-cut #5). The UI only picks a language side and renders labels.
- **Two orderings, don't confuse them.** Engine `STATUS_RANK` (§8.1: suitable=1…avoid=5) decides *which* status wins per dish (done server-side). The **visual priority** (§13: Avoid > Risky > Ask First > Unknown > Suitable) decides *display order of groups* on screen — Avoid group first. Unknown sits above Suitable so it is never buried.
- **EN/VI toggle is a DATA display preference, not the UI locale.** Per the confirmed i18n override, bilingual DATA (dish name, reason, action, ingredients) is `Record<'en'|'vi',string>` picked client-side; static chrome (headings, filter labels, empty-state text, status labels, caveat) comes from `useTranslations()`. `LanguageToggle` flips `dataLang` only — it does **not** change the `/en`↔`/vi` URL locale (that is phase-09's app switcher). Default `dataLang` to the current URL locale.
- **Suitable is never "safe".** Any Suitable card MUST render the caveat ("looks lower risk for your profile, but please confirm with staff before ordering"). Status labels are limited to Suitable / Ask First / Risky / Avoid / Unknown. No forbidden copy anywhere (CI gate `assert-no-unsafe-copy.ts`).
- **Offline = saved-only, never live fetch.** Per §11.2 the recommendation response is not SW-cached. Instead, on a successful fetch we persist the cards to Dexie `savedDishes`; when offline we read from Dexie and show `OfflineBanner`. Offline with nothing saved → allergy-card CTA (§12.4).
- **Unknown is honest, never hidden (cross-cut #3).** Allergens with no seed coverage (treenut, soy) resolve to `unknown`; the Unknown group and Unknown badge must always render when present.
- **Semantic tokens only.** Status colors come from theme tokens (`status-avoid`, `status-risky`, `status-askfirst`, `status-unknown`, `status-suitable`); components use Tailwind classes, never raw hex/rgb.

## Requirements

### Functional
- `/dishes`: fetch recommendations for the active profile + destination city; group cards by status; render groups in visual-priority order (Avoid → Risky → Ask First → Unknown → Suitable).
- Each card shows: dish name, status badge, matched allergen/diet risk, confidence, reason, action, source, last-checked.
- Filter control: "All" + one chip per status; selecting a status shows only that group. Group headers show counts (from `summary`).
- EN/VI `LanguageToggle` controls displayed data language for names/reasons/actions/ingredients.
- Persistent safety reminder at top of `/dishes`; Suitable cards always show the caveat.
- Empty/error/offline states (§12.4): no active profile → link to onboarding; `summary.total === 0` → "city not seeded yet"; fetch error → message + retry; offline → saved dishes if any, else allergy-card CTA.
- `/dishes/[dishId]` (§12.5): dish names EN/VI, description, common ingredients, possible hidden ingredients, risk for active profile (status/confidence/reason/action/source/last-checked), CTA "Generate question card" (links to `/question-card?dishId=…`).
- Deep-linkable detail page: works when opened directly (no prior list visit).

### Non-functional
- Each impl file < ~200 lines; split container / group list / card / badges / hooks / api client.
- No forbidden safety copy; status labels restricted to the five allowed; caveat mandatory on Suitable.
- Zod-parse API responses at the client fetch boundary before rendering (standing rule).
- Semantic color tokens only; theme-aware (light/dark) via tokens.
- Navigation via `@/i18n/navigation` `Link` (locale-prefixed), never `next/link`.
- Accessible: badges convey status by text label + icon, not color alone.

## Architecture

**System design.** Route `page.tsx` (server) → renders `<DishGuide />` (client). `DishGuide` reads the active profile (phase-08 `useActiveProfile`) and online status, runs a TanStack Query keyed by `['recommendations', city, profileHash]`, and dispatches to state components: loading / error / empty / offline / grouped-list. On query success it writes cards into Dexie `savedDishes`. When offline it hydrates from `savedDishes`.

**Component interactions.**
- `DishGuide` (client container) — profile guard, query orchestration, offline branch, filter state, `dataLang` state.
- `DishFilterBar` — status chips + counts; emits active filter.
- `DishGroupList` — renders groups in visual-priority order; each group a header + list of `DishCard`.
- `DishCard` — list item: dish name (data-lang) + `Link` to detail; embeds `RecommendationCard` body for the evidence row (DRY).
- `RecommendationCard` — the reusable evidence block: `StatusBadge`, `ConfidenceBadge`, `SourceBadge`, reason, action, last-checked, Suitable caveat. Reused verbatim in dish detail's risk section.
- `StatusBadge` / `ConfidenceBadge` / `SourceBadge` — pure presentational; map enum/bucket → next-intl label + semantic token.
- `LanguageToggle` — flips `dataLang` ('en'|'vi'); pure controlled component.
- `DishDetail` (client) — two queries: `GET /dishes/{id}` (static dish info) + shared recommendations query (find the matching card for the risk block). Renders description/ingredients + `RecommendationCard` + question-card CTA.

**Data flow.**
```
useActiveProfile() ──► DishGuide
        │ (POST body: { city, language, profile })
        ▼
POST /api/v1/recommendations/dishes ──► { groups{suitable,askFirst,risky,avoid,unknown}, summary }
        │ Zod-parse ──► write savedDishes (Dexie)
        ▼
group in visual-priority order ──► DishCard[] ──► RecommendationCard
        (offline) ◄── read savedDishes (Dexie) ── OfflineBanner
```

## Related Code Files

### To create
- `apps/web/src/app/(app)/dishes/page.tsx` — server shell rendering `<DishGuide />` + `<SafetyNotice />`.
- `apps/web/src/app/(app)/dishes/[dishId]/page.tsx` — server shell rendering `<DishDetail dishId=… />`.
- `apps/web/src/features/dishes/dish-guide.tsx` — client container (query + state routing).
- `apps/web/src/features/dishes/dish-filter-bar.tsx` — status filter chips + counts.
- `apps/web/src/features/dishes/dish-group-list.tsx` — priority-ordered group renderer.
- `apps/web/src/features/dishes/dish-card.tsx` — list-item dish card (name + link + evidence).
- `apps/web/src/features/dishes/dish-detail.tsx` — detail client component.
- `apps/web/src/features/dishes/use-dish-recommendations.ts` — TanStack Query hook + Dexie persistence + offline hydration.
- `apps/web/src/features/dishes/dishes-client.ts` — fetch fns + Zod response parsing for the two endpoints.
- `apps/web/src/features/dishes/saved-dishes.ts` — Dexie `savedDishes` read/write helpers (thin; imports phase-08 `dexie.ts`).
- `apps/web/src/components/status/status-badge.tsx`
- `apps/web/src/components/status/confidence-badge.tsx`
- `apps/web/src/components/status/source-badge.tsx`
- `apps/web/src/components/status/status-visuals.ts` — visual priority order + status→semantic-token map (single source of truth).
- `apps/web/src/components/safety/recommendation-card.tsx` — reusable evidence block + Suitable caveat.
- `apps/web/src/components/common/language-toggle.tsx`

### To modify
- `apps/web/messages/en.json`, `apps/web/messages/vi.json` — add dish-guide chrome keys (`dishes.title`, `dishes.safetyReminder`, `dishes.emptyNoProfile`, `dishes.emptyNotSeeded`, `dishes.error`, `dishes.retry`, `dishes.offlineNoSaved`, `dishes.lastChecked`, `dishes.source`, `dishes.confidence`, `dishes.filterAll`, detail labels `dishes.commonIngredients` / `dishes.hiddenIngredients` / `dishes.generateQuestionCard`). Reuse existing `statuses.*`, `suitableCaveat`, `safetyDisclaimer`, `offlineNotice` keys from phase-09.
- `apps/web/tailwind.config.ts` / `globals.css` — add `status-*` semantic tokens (fg/bg, light+dark) **only if phase-09 did not already define them**.

### To delete
- None.

## Implementation Steps

1. **Confirm dependency contracts.** Verify phase-06 exposes `POST /api/v1/recommendations/dishes` (groups+summary of `DishRecommendationCard`) and `GET /api/v1/dishes/{dishId}`; phase-08 exposes `useActiveProfile()`, `useOnlineStatus()`, and the Dexie `db` with `savedDishes`; phase-09 exposes `SafetyNotice`, `OfflineBanner`, `@/i18n/navigation`, and `statuses.*`/`suitableCaveat` message keys. Note any gaps before coding.
2. **Status visuals (`status-visuals.ts`).** Export `STATUS_DISPLAY_ORDER = ['avoid','risky','ask_first','unknown','suitable']`, a `groupKeyByStatus` map to the API `groups` keys (`ask_first→askFirst`), and `statusToken(status)` returning semantic Tailwind class names. Single source of truth for ordering + color.
3. **Badges.** `StatusBadge` (label via `useTranslations('statuses')`, icon + token, text-not-color-only), `ConfidenceBadge` (bucket → `dishes.confidence` + low/med/high label), `SourceBadge` (source string + `dishes.source` label). All pure, < 40 lines each.
4. **`RecommendationCard`.** Given a `DishRecommendationCard` + `dataLang`, render badges, `reason[dataLang]`, `action[dataLang]`, formatted `lastCheckedAt`, and — when `status === 'suitable'` — the `suitableCaveat`. Reused by list and detail.
5. **`LanguageToggle`.** Controlled EN/VI segmented control; default from URL locale; emits `dataLang`.
6. **Fetch client (`dishes-client.ts`).** `fetchRecommendations({city,profile})` (POST) and `fetchDish(dishId)` (GET); Zod-parse both responses; throw typed errors. Ensures no unexpected shape (and no raw Decimal) reaches UI.
7. **Query hook (`use-dish-recommendations.ts`).** `useQuery` keyed by `['recommendations', city, profileHash]`, `enabled: !!profile && online`; `onSuccess` → persist cards to Dexie `savedDishes`; when `!online` → resolve from `savedDishes`. Return `{ groups, summary, status, source: 'live'|'saved' }`.
8. **`DishGuide` container.** Branch: no profile → onboarding CTA; loading → skeleton; error → error + retry; `summary.total===0` → not-seeded message; offline+no-saved → allergy-card CTA; else render `DishFilterBar` + `DishGroupList`. Hold `activeFilter` + `dataLang` state. `LanguageToggle` + `SafetyNotice` always visible.
9. **`DishFilterBar` + `DishGroupList`.** Filter chips (All + per-status with counts). Group list iterates `STATUS_DISPLAY_ORDER`, skips empty groups (or shows only the filtered one), renders header + `DishCard[]`.
10. **`DishCard`.** Dish name (`name[dataLang]`) as `Link` to `/dishes/{id}`; embed `RecommendationCard` for the evidence row.
11. **`/dishes/page.tsx`.** Server shell: `<SafetyNotice />` + `<DishGuide />`.
12. **`DishDetail` + `/dishes/[dishId]/page.tsx`.** Fetch dish (GET) for names/description/common+hidden ingredients; reuse recommendations query to locate the card for the active-profile risk block (`RecommendationCard`); if not present (deep link, group filtered out) fetch recommendations then match. Add "Generate question card" `Link` → `/question-card?dishId={id}`. Server shell renders `<DishDetail />`.
13. **Chrome keys + tokens.** Add message keys to `en.json`/`vi.json`; add `status-*` tokens if missing. Grep for raw hex in new files.
14. **Self-check.** `pnpm typecheck`, `pnpm lint`, `pnpm copy:check`; manual pass of all five list states + detail + EN/VI toggle + offline.

## Todo List

- [x] Confirm phase-06/08/09 contracts (endpoints, profile hook, Dexie, chrome keys)
- [x] `status-visuals.ts` — display order + group-key map + semantic token map
- [x] `StatusBadge`, `ConfidenceBadge`, `SourceBadge`
- [x] `RecommendationCard` (evidence block + Suitable caveat)
- [x] `LanguageToggle` (data-lang, defaults to URL locale)
- [x] `dishes-client.ts` — POST/GET fetchers + Zod parsing
- [x] `use-dish-recommendations.ts` — query + Dexie persist + offline hydrate
- [x] `DishGuide` container with all state branches
- [x] `DishFilterBar` + `DishGroupList` (priority order, counts)
- [x] `DishCard`
- [x] `/dishes/page.tsx` server shell
- [x] `DishDetail` + `/dishes/[dishId]/page.tsx`
- [x] Add chrome message keys (en/vi) + status tokens (if absent)
- [x] typecheck / lint / copy:check + manual state walkthrough

## Success Criteria

Mirrors §19 P1-05:
- `/dishes` uses the **active local profile** (from Dexie/Zustand, never URL) and calls `POST /api/v1/recommendations/dishes`.
- Cards are **grouped by status** and displayed in visual priority **Avoid > Risky > Ask First > Unknown > Suitable**.
- **Every card shows source, confidence, reason, action, and last-checked**; matched allergen/diet risk shown.
- **No forbidden safe wording**; only the five allowed status labels; every Suitable card renders the caveat; `pnpm copy:check` passes.
- `/dishes/[dishId]` shows names EN/VI, description, common + hidden ingredients, the per-profile risk block, and the Generate-question-card CTA; deep-links work.
- Empty/error/offline states all render correctly (no profile → onboarding; not seeded → explain; error → retry; offline → saved dishes or allergy-card CTA).
- EN/VI toggle switches displayed dish data without changing the URL locale.
- `pnpm typecheck` / `pnpm lint` pass; UI uses semantic tokens only (no raw hex in new files).

**Validation:** load `/dishes` with a seeded active profile → grouped cards; toggle EN/VI → data language flips, chrome unchanged; open a dish → detail renders; clear the profile → onboarding CTA; go offline after one successful fetch → saved dishes + `OfflineBanner`; offline with no saved data → allergy-card CTA; run `pnpm copy:check`.

## Risk Assessment

- **Unknown collapsing into Suitable (safety-critical).** Mitigation: `status-visuals.ts` keeps Unknown as its own group above Suitable; StatusBadge maps `unknown` explicitly; never coerce. The engine already guarantees this server-side (§8.2) — UI must not undo it.
- **Missing Suitable caveat.** Mitigation: caveat lives inside `RecommendationCard` gated on `status==='suitable'`, so it can't be forgotten by any consumer; covered by copy check + a component test.
- **Raw `Decimal` / wrong shape leaking to UI.** Mitigation: Zod-parse in `dishes-client.ts`; rely on phase-06 mappers (cross-cut #5). Confidence is already a bucket string, so the UI never formats a Decimal.
- **Offline stale data shown as current.** Mitigation: `source:'saved'` badge + `OfflineBanner` (`offlineNotice` copy) + last-checked timestamp on every card make staleness explicit; honor `stale?` flag if present.
- **Detail page for a dish absent from the filtered/loaded groups.** Mitigation: `DishDetail` refetches recommendations if the card isn't in cache before rendering the risk block; if still absent, show Unknown-style "risk not available for this profile" (never a fabricated Suitable).
- **File bloat.** Mitigation: split per the file list; badges and helpers isolated; container delegates to state components.

## Security Considerations

- **Local-first profile (§16, P1-05):** the profile is read from Dexie/Zustand and sent only in the POST body — never placed in the URL/query or `localStorage`. Deep links carry `dishId` only, no profile data.
- **Safety copy:** the five allowed status labels + mandatory Suitable caveat + persistent safety reminder; forbidden phrases absent (enforced by `assert-no-unsafe-copy.ts`). Status labels/caveat sourced from next-intl keys so wording stays centrally controlled.
- **No blind caching of recommendations (§11.2):** offline persistence is an explicit Dexie write of returned cards, not an opaque SW cache of the POST; nothing private is cached without intent.
- **OSM discovery-only:** no restaurant data appears anywhere in this UI (restaurants stay `unverified` and out of Phase-1 public UX). Cards reference dishes only.
- **Input trust:** Zod-parse every API response before render; render text as data (no `dangerouslySetInnerHTML`).

## Next Steps

- **Depends on:** phase-06 (dishes + recommendations API), phase-08 (Dexie `savedDishes`/`profiles`, active-profile + online-status hooks), phase-09 (app shell, next-intl + `@/i18n/navigation`, `SafetyNotice`/`OfflineBanner`, status message keys, semantic tokens).
- **Unblocks:** phase-12 question-card UI reuses the `/question-card?dishId=` CTA and dish-name data shape; the E2E/tests phase (P1-09) drives the `/dishes` happy path and the copy-safety gate against these screens; `RecommendationCard`/`StatusBadge` are reused by the admin dish-risk views.
