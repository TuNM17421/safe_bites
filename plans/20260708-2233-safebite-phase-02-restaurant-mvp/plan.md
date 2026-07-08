# SafeBite Travel — Phase 02: Restaurant MVP

**Spec:** `docs/SAFE_BITE_PHASE_02_IMPL_SPEC.md`
**Goal:** Convert the dish-level product into a restaurant decision workflow:
`profile → restaurant list → restaurant detail → menu item recommendation → question card`.
Risk **reduction**, never elimination. List-first; map is decorative P1.

## Grounding (verified against the codebase, not assumed)

- **DB already has** `Restaurant`, `MenuItem`, `ImportRun` (populated: 50 OSM + 5 OpenMap rows, both discovery-only). **Missing:** `MenuItemAllergenStatus`; `slug`/`brand`/`operator` on `Restaurant`; `ingredient_notes`/`customization_notes`/`shared_cookware`/`shared_fryer`/`can_customize` on `MenuItem`; Phase-02 indexes.
- **PostGIS installed but unused** (lat/lon = `Decimal(10,7)`). → Use **Haversine** (KISS); no geography column in Phase 02.
- **Domain**: reuse `LocalUserProfile` (not `AllergyProfile`), `Bilingual` (not `LocalizedText`), the `RecommendationStatus` union, `STATUS_RANK` (strictest-wins), `isConservative`, and the throw-on-`unknown→suitable` invariant. Restaurant/menu logic is greenfield.
- **Web**: RSC-wrapper→client-feature; `apiOk`/`apiError`/`parseQuery`/`parseBody`; `requireAdmin`; generic `AdminResourcePage`; Dexie v1→`.version(2)`; bottom nav `grid-cols-5`→6; flip disabled home CTA; `copy:check` denylist + `safeLocalizedText`.

## Phases

| # | Phase | Status | Depends on |
|---|-------|--------|-----------|
| 01 | [Domain types & evaluators](phase-01-domain-types-and-evaluators.md) | ✅ Done | — |
| 02 | [Prisma schema & migration](phase-02-prisma-schema-and-migration.md) | ✅ Done | — |
| 03 | [Importer wiring & demo menu seed](phase-03-importer-wiring-and-demo-seed.md) | ✅ Done | 02 |
| 04 | [Admin restaurant & menu APIs](phase-04-admin-restaurant-and-menu-apis.md) | ✅ Done | 02 |
| 05 | [Admin restaurant & menu UI](phase-05-admin-restaurant-and-menu-ui.md) | ✅ Done | 04 |
| 06 | [Public restaurant APIs](phase-06-public-restaurant-apis.md) | ✅ Done | 01, 02 |
| 07 | [Public restaurant UI](phase-07-public-restaurant-ui.md) | ✅ Done | 06 |
| 08 | [Location, map shell, offline, question card](phase-08-location-map-offline-questioncard.md) | Not started | 07 |
| 09 | [Tests, README, quality gates](phase-09-tests-readme-quality-gates.md) | Not started | all |

## Build order (spec §20)

Domain → schema/migration → importer wiring → admin API → admin UI → public API → public UI → location/offline/question-card → tests/docs/gates. **Do not start with the map.**

## Non-negotiable safety invariants

- Status labels only: `Suitable / Ask First / Risky / Avoid / Unknown`. Never "Guaranteed Safe / 100% Safe / Allergy-proof / This dish is safe".
- `Unknown` is never upgraded to `Suitable`. OSM/OpenMap discovery-only data never verifies allergy suitability (readiness capped at **C**). No menu data ⇒ not recommended. `Suitable` always carries a confirm-with-staff caveat. Severe/anaphylaxis profiles get stricter wording + score rules. No LLM/OCR-derived facts created in Phase 02.
- **No allergy profile in URL** — profile always in POST body; active profile in client state.

## Definition of done

`pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check && pnpm test:e2e && pnpm build` all pass. No skipped restaurant tests. README + docs updated.

## Out of scope (do not build)

OCR, LLM parsing, menu/photo/PDF upload, restaurant self-onboarding, post-meal feedback, user accounts, payments, Google Places/Maps, push notifications, travel planner.
