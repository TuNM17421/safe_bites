# Phase 11 — Question Card UI (`/question-card`)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §12.6 `/question-card` acceptance (1402-1415): generate from profile, optional dish context, EN/VI toggle, large-text, fullscreen-ish, copy, save to IndexedDB, offline show last saved
  - §9.6 `POST /api/v1/question-cards` request/response contract (1074-1135) — `{ id, targetLanguage, source, createdAt, text, sections[] }`
  - §15 Question Card Templates (1531-1567) — deterministic `buildQuestionCard`, exact EN/VI severe-peanut output; **no LLM**
  - §13 Components (1459-1490) — `QuestionCardDisplay` is a required reusable component
  - §7 domain types (`LocalUserProfile`, `LanguageCode`), §10/§10.2 offline behavior, §14 safety copy keys
  - §19 P1-06 acceptance (1814-1828)
- Sibling phase files (dependencies — this plan dir):
  - **phase-05** (`@safebite/domain`) — `buildQuestionCard`, `QuestionCard` type, `copy`, Zod `questionCardRequestSchema`. Pure/frameworkless → callable client-side for offline regen.
  - **phase-06** — `POST /api/v1/question-cards` (calls `buildQuestionCard` server-side) + `GET /api/v1/allergens` (bilingual allergen name/aliases) + `GET /api/v1/dishes/{dishId}` (dish name for context).
  - **phase-08** — Dexie `questionCards` table + `questionCardRepo` (`saveLastQuestionCard`/`loadLastQuestionCard`), `metadataRepo`, `useActiveProfile`, `useOnlineStatus`.
  - **phase-09** — app shell / next-intl / PWA: `SafetyNotice`, `OfflineBanner`, `@/i18n/navigation`, semantic tokens, `messages/{en,vi}.json`.
  - **phase-10** — dish guide links here via `/question-card?dishId=…`; Dexie `savedDishes` is a source of the dish name offline.
- Kit: not consumed here. Relevant only via cross-cut note #3 (see Key Insights).

## Overview

- **Priority:** High (P1-06 — core Phase-1 flow; the card is the app's most concrete real-world utility).
- **Current status:** Not started.
- **Brief description:** Build `/question-card`: a client screen that generates a deterministic bilingual "show-to-staff" question card from the active local profile (plus optional dish context via `?dishId=`), with an EN/VI **target-language** toggle that is independent of the UI locale, large-text mode, a fullscreen-ish presentation overlay for showing the phone to restaurant staff, a copy-to-clipboard button, save-to-IndexedDB on every generate, and offline display of the last saved card. Ships the reusable `QuestionCardDisplay` component (§13). Adds no new endpoints.

## Key Insights

- **`targetLanguage` ≠ UI locale (locked decision).** The card is DATA. A traveler reading the app in English wants a **Vietnamese** card to hand to Hanoi staff (spec §9.6 example: `profile.language: "en"`, `targetLanguage: "vi"`). Default `targetLanguage` to the **destination language** (Vietnamese for the Hanoi pilot), NOT the current `/en`|`/vi` URL locale. The toggle flips only `targetLanguage`; it never touches the route locale.
- **Two generation paths, one shape.** Online "Generate" = `POST /api/v1/question-cards` (spec-required, server-authoritative `id`/`source`/`createdAt`). Instant EN/VI + dish-context toggles and **offline regen** = call the pure domain `buildQuestionCard` client-side (phase-05 is frameworkless, bundled on the client). Both are mapped through one local `toQuestionCardRecord()` so output is byte-identical (determinism, §15).
- **The card is PROFILE-driven, not risk-driven → honest by construction.** It asks staff about every allergen the user selected, regardless of whether we have dish risk data. So an allergen with zero seed coverage (treenut/soy — cross-cut note #3) still produces a question line; we never silently drop it. The card contains only *questions*, never a safety claim — structurally free of forbidden copy (§0/§16).
- **Guaranteed offline fallback (§12.6).** Offline behavior degrades gracefully: (1) if cached allergen metadata + active profile exist → regen live via domain function; (2) else load the last saved card from Dexie (`loadLastQuestionCard`). Requirement P1-06 "last saved card visible offline" is the floor; regen is the nicer path when data is present.
- **Persist on every generation.** Each generate/regenerate writes through `questionCardRepo.saveLastQuestionCard` (phase-08), attaching `profileId` and optional `dishId`. This keeps "last saved card" current and satisfies the offline requirement without extra user action.
- **Record-shape reconciliation (cross-phase gotcha).** The Dexie `questionCards` index (§10) is `"id, profileId, dishId, targetLanguage, createdAt"`, the API returns `{ id, targetLanguage, source, createdAt, text, sections[] }`, and phase-05's domain `QuestionCard` is leaner (`title`/`lines`). This phase pins the **canonical persisted/rendered record** = API §9.6 shape **plus** client-attached `profileId` + `dishId?`. Confirm phase-08's `questionCards` row type matches; extend additively if it still reflects the leaner domain type (no migration — additive fields only).
- **Fullscreen via CSS overlay, not the Fullscreen API.** iOS Safari does not support `element.requestFullscreen()`. Use a `fixed inset-0 z-50` high-contrast presentation overlay toggled by state — reliable on iOS + Android, and it composes with large-text mode.
- **Semantic tokens + next-intl chrome only.** Card body text is bilingual DATA from the domain templates. All chrome (buttons, labels, hints) comes from `useTranslations()`. No raw hex/rgb; the file tree is scanned by `assert-no-unsafe-copy.ts`.

## Requirements

### Functional

1. `/question-card` generates a card from the **active local profile** (phase-08); no account, profile never in the URL.
2. Optional dish context: when opened as `/question-card?dishId=…`, include the dish name in the card (server resolves it online; offline it is read from Dexie `savedDishes`). A toggle lets the user include/exclude dish context.
3. **EN/VI target-language toggle**, defaulting to the destination language, independent of the UI locale; switching re-renders instantly (domain regen, no refetch).
4. **Large-text mode** toggle — scales the card body for readability across a table.
5. **Fullscreen-ish presentation** overlay — full-viewport, high-contrast, minimal chrome, for showing the phone to staff; exitable.
6. **Copy button** — copies the card's full `text` to the clipboard; shows a "copied" confirmation.
7. **Save to IndexedDB** on every generation via `questionCardRepo.saveLastQuestionCard` (attach `profileId`, `dishId?`).
8. **Offline**: show `OfflineBanner`; regen from cached allergens if possible, else load and display the last saved card. Never a blank screen.
9. Ship reusable `QuestionCardDisplay` (§13) rendering title + `sections[]` (each `kind` a block) + target-language label + timestamp.
10. Empty state: no active profile → link to `/onboarding`.

### Non-functional

- Each impl file < ~200 lines; split screen / toolbar / display / hook / client (KISS/DRY).
- **No LLM** — generation is deterministic templates only (§15); client regen calls the same domain function as the API.
- Zod-parse the API response at the client boundary before rendering/persisting (standing rule).
- Navigation via `@/i18n/navigation`, never `next/link`. Semantic color tokens only; theme-aware.
- No forbidden safety copy; the card asserts nothing "safe" (§0/§13/§16). Accessible: toggles are labeled buttons; copy has an aria-live confirmation.

## Architecture

**System design.** Route `page.tsx` is a thin server shell that reads `searchParams.dishId` and renders `<SafetyNotice />` + `<QuestionCardScreen dishId?>` (client). The screen owns state (`targetLanguage`, `largeText`, `includeDish`, `presentation`), orchestrates generation, persists, and branches on online/offline. Display is a pure component reused in normal and fullscreen layouts.

**Component interactions.**
- `QuestionCardScreen` (client container) — profile guard, allergen metadata, generate action, offline branch, toolbar wiring, presentation overlay.
- `QuestionCardToolbar` — target-lang EN/VI toggle, large-text toggle, dish-context toggle (only if `dishId`), copy button, fullscreen enter/exit.
- `QuestionCardDisplay` (`components/safety/`) — pure: renders `card.sections[]` by `kind`, target-language label, `createdAt`; `largeText` prop scales typography.
- `use-question-card.ts` — generation (online POST + offline/toggle domain regen), Dexie persist, offline hydrate; returns `{ card, generate, isGenerating, source: 'live'|'saved', error }`.
- `use-allergens.ts` — TanStack Query on `GET /allergens`, mirrored to Dexie `metadata` (`allergens`) so offline regen has name/aliases. (Reuse if onboarding already ships it.)
- `question-card-client.ts` — `fetchQuestionCard(body)` (POST + Zod) and `regenQuestionCard(input)` (domain `buildQuestionCard` + `toQuestionCardRecord`).

**Data flow.**
```
useActiveProfile() + use-allergens() ──► QuestionCardScreen
        │ online: POST /api/v1/question-cards { profile, dishId?, targetLanguage }
        │ offline / toggle: buildQuestionCard(profile, allergens, targetLanguage, dishName?)
        ▼
toQuestionCardRecord ── Zod ── QuestionCardRecord { id, targetLanguage, source, createdAt, text, sections[], profileId, dishId? }
        │ saveLastQuestionCard (Dexie)                     ▲
        ▼                                                  │ offline fallback
QuestionCardDisplay (normal | fullscreen overlay) ◄── loadLastQuestionCard (Dexie)
```

Dish name for context: resolved server-side by the POST route online; for client regen it is read from Dexie `savedDishes[dishId]` (phase-10) or a one-off `GET /dishes/{dishId}` when online. If unavailable, the card is generated without dish context (dish context is optional).

## Related Code Files

### To create
- `apps/web/src/app/(app)/question-card/page.tsx` — server shell; reads `searchParams.dishId`; renders `<SafetyNotice />` + `<QuestionCardScreen />`.
- `apps/web/src/features/question-card/question-card-screen.tsx` — client container (state, generate, offline branch, presentation overlay).
- `apps/web/src/features/question-card/question-card-toolbar.tsx` — target-lang / large-text / dish-context toggles, copy, fullscreen controls.
- `apps/web/src/features/question-card/use-question-card.ts` — generation + persistence + offline hydrate hook.
- `apps/web/src/features/question-card/use-allergens.ts` — allergen-metadata query + Dexie `metadata` cache (reuse if onboarding created it).
- `apps/web/src/features/question-card/question-card-client.ts` — `fetchQuestionCard` (POST+Zod), `regenQuestionCard` (domain + local mapper), `toQuestionCardRecord`.
- `apps/web/src/components/safety/question-card-display.tsx` — reusable `QuestionCardDisplay` (§13).

### To modify
- `apps/web/messages/en.json`, `apps/web/messages/vi.json` — add `questionCard.*` chrome keys (`title`, `generate`, `generating`, `targetLanguage`, `showInEn`, `showInVi`, `largeText`, `includeDish`, `copy`, `copied`, `fullscreen`, `exitFullscreen`, `showToStaff`, `offlineSaved`, `noProfile`, `savedAt`). Reuse existing `safetyDisclaimer`/`offlineNotice` from phase-09.
- `apps/web/src/lib/dexie.ts` (phase-08) — **verify/extend** the `questionCards` row type to the canonical record shape (`id, profileId, dishId?, targetLanguage, createdAt, source, text, sections[]`); additive only, no migration.
- `apps/web/src/components/app-shell/bottom-nav.tsx` (phase-09) — ensure the "Generate question card" entry links to `/question-card` (verify only if already present).

### To delete
- None.

## Implementation Steps

1. **Confirm contracts.** Verify phase-06 `POST /api/v1/question-cards` returns `{ id, targetLanguage, source, createdAt, text, sections[] }` and `GET /allergens` returns bilingual name/aliases; phase-05 exports `buildQuestionCard` + a Zod schema for the response; phase-08 exposes `useActiveProfile`, `useOnlineStatus`, `questionCardRepo`, `metadataRepo`, and a `questionCards` row type wide enough for the record shape (extend if not). Note gaps before coding.
2. **`question-card-client.ts`.** `fetchQuestionCard(body)` → POST, Zod-parse to `QuestionCardRecord`. `toQuestionCardRecord(domainCard, {id, profileId, dishId?, source, createdAt})` → maps domain output into the API §9.6 shape (`sections[]` with `kind`, joined `text`). `regenQuestionCard({profile, allergens, targetLanguage, dishName?})` → `buildQuestionCard(...)` then `toQuestionCardRecord(..., { source: 'template_generated', id: crypto.randomUUID(), createdAt: new Date().toISOString() })`. Keep the mapper identical to the server's so online/offline match.
3. **`use-allergens.ts`.** `useQuery(['allergens'])` → `GET /allergens`; on success `metadataRepo.setMetadata('allergens', items)`. Expose `getAllergensForProfile(profile)` filtering to `profile.allergies[].allergenId`; offline reads from `metadata`.
4. **`use-question-card.ts`.** Inputs: active profile, allergens, `targetLanguage`, `includeDish`, `dishId?`. `generate()`: online → `fetchQuestionCard`; offline/toggle → `regenQuestionCard`. Resolve dish name (Dexie `savedDishes` → else `GET /dishes/{id}` when online). Always `saveLastQuestionCard` (attach `profileId`, `dishId?`). Offline with no regen possible → `loadLastQuestionCard`, `source:'saved'`. Return `{ card, generate, isGenerating, source, error }`.
5. **`QuestionCardDisplay`.** Pure component: title (severity statement), then a block per `section.kind` (`severity_statement`/`ingredient_question`/`cross_contact_question`/`kitchen_check`), a target-language label chip, and `createdAt`. `largeText` prop switches to a larger type scale; high-contrast via semantic tokens. No chrome logic here.
6. **`QuestionCardToolbar`.** Controlled buttons: EN/VI target toggle (labels `showInEn`/`showInVi`), large-text toggle, dish-context toggle (rendered only when `dishId` present), copy button (`navigator.clipboard.writeText(card.text)` with a `document.execCommand` fallback; aria-live "copied"), fullscreen enter/exit. All labels via `useTranslations('questionCard')`.
7. **`QuestionCardScreen`.** Profile guard → no profile: onboarding `Link` + message. Else: default `targetLanguage` from `destinationCity` (vi for hanoi/da_nang/hoi_an, else 'en'); hold `largeText`, `includeDish` (default true when `dishId`), `presentation` state. Wire toolbar + `use-question-card`; auto-generate on mount and on `targetLanguage`/`includeDish` change. Offline → `OfflineBanner`. Presentation mode → render `QuestionCardDisplay` inside a `fixed inset-0 z-50` overlay with an exit button (Escape + button).
8. **`/question-card/page.tsx`.** Server shell: read `searchParams.dishId`, render `<SafetyNotice />` + `<QuestionCardScreen dishId={…} />`.
9. **Chrome keys.** Add `questionCard.*` to `messages/en.json` + `vi.json`; keep both locales in sync.
10. **Self-check.** `pnpm typecheck`, `pnpm lint`, `pnpm copy:check`; manual walkthrough: generate → toggle EN/VI (instant, URL locale unchanged) → large text → fullscreen → copy → reload offline shows last saved card.

## Todo List

- [ ] Confirm phase-05/06/08/09 contracts + `questionCards` row-type width (extend if needed)
- [ ] `question-card-client.ts` — `fetchQuestionCard` (POST+Zod), `toQuestionCardRecord`, `regenQuestionCard`
- [ ] `use-allergens.ts` — `/allergens` query + Dexie `metadata` cache + per-profile filter
- [ ] `use-question-card.ts` — online/offline generation, dish-name resolve, persist, offline hydrate
- [ ] `QuestionCardDisplay` (`components/safety/`) — sections by `kind`, target-lang label, timestamp, large-text
- [ ] `QuestionCardToolbar` — target-lang / large-text / dish toggles, copy, fullscreen
- [ ] `QuestionCardScreen` — profile guard, defaults, presentation overlay, offline branch
- [ ] `/question-card/page.tsx` server shell (reads `searchParams.dishId`)
- [ ] `questionCard.*` chrome keys in `messages/{en,vi}.json`
- [ ] typecheck / lint / copy:check + manual EN·VI·large·fullscreen·copy·offline walkthrough

## Success Criteria

Mirrors §19 P1-06 (1820-1827) and §12.6:

- **Generate from profile:** with a seeded active profile, `/question-card` renders a card built from the profile's allergens (via `POST /api/v1/question-cards`).
- **Dish context:** `/question-card?dishId=…` includes the dish name; the include-dish toggle adds/removes it.
- **EN/VI toggle:** switching target language re-renders the card instantly and does **not** change the `/en`↔`/vi` URL locale; VI severe-peanut output matches §15 exactly.
- **Large-text mode** visibly enlarges the card body; **fullscreen-ish** overlay presents it full-viewport and is exitable.
- **Copy button** copies the full card text; a confirmation appears.
- **Save to IndexedDB:** every generation persists via `saveLastQuestionCard`; `db.questionCards` holds the record with `profileId` and `dishId?`.
- **Offline:** after one generation, reloading offline shows the last saved card (or regenerates from cached allergens) with `OfflineBanner`; never blank.
- **Safety/quality:** no forbidden copy; card contains only questions; `pnpm copy:check`, `pnpm typecheck`, `pnpm lint` pass; semantic tokens only.

**Validation:** open `/question-card` with an active profile → card renders → toggle EN/VI (chrome unchanged, card language flips) → enable large text → fullscreen → copy → paste elsewhere matches `card.text` → set network offline, reload → last saved card + offline banner. Clear profile → onboarding CTA.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Online vs offline regen diverge (non-determinism) | Different card text online/offline breaks trust | Single `toQuestionCardRecord` + the same domain `buildQuestionCard`; no clock/random inside the mapper except explicit `id`/`createdAt`; §15 exact-string test upstream |
| `targetLanguage` accidentally bound to UI locale | Card printed in wrong language for staff | Separate state defaulted to destination language; toggle never calls `@/i18n/navigation` router; covered by manual + E2E check |
| Record-shape drift (Dexie index vs API vs domain) | Save/load throws or loses `sections` | Pin canonical `QuestionCardRecord`; verify/extend phase-08 `questionCards` row type (additive); Zod-parse before persist |
| Offline with nothing cached | Blank screen (P1-06 fail) | Always persist on generate; offline fallback to `loadLastQuestionCard`; if truly empty → message + onboarding/allergy-card CTA |
| Clipboard API unavailable (iOS/insecure ctx) | Copy button silently fails | `document.execCommand('copy')` fallback + visible confirmation; button never claims success without it |
| Allergen with no seed coverage omitted (cross-cut #3) | Card silently drops treenut/soy question | Card is profile-driven — every selected allergen yields a line regardless of dish data; assert in review |
| Fullscreen API unsupported on iOS | Presentation mode broken | CSS `fixed inset-0` overlay, not `requestFullscreen()`; Escape + button exit |
| File bloat > 200 lines | Maintainability | Split screen/toolbar/display/hook/client per file list |

## Security Considerations

- **Local-first profile (§10.1):** the profile is read from Dexie/Zustand and sent only in the POST body — never in the URL/query. Deep links carry `dishId` only. No profile data in `localStorage`.
- **No auth surface:** `/question-card` and `POST /api/v1/question-cards` are public compute over on-device profile data (no accounts in Phase 1). Admin/`sbt_admin` cookie is unrelated.
- **Safety copy (§0/§13/§16):** the card is a set of questions and asserts nothing "safe"; a persistent `SafetyNotice` sits on the screen; all files scanned by `assert-no-unsafe-copy.ts`; forbidden phrases absent by construction.
- **No LLM / deterministic (§15):** generation uses fixed templates only; no external inference call, no data exfiltration of the profile to a model.
- **Cached allergen metadata** stored in Dexie `metadata` is public reference data (bilingual names/aliases) — no secrets; `metadataRepo.assertNoSecrets` (phase-08) still guards writes.
- **OSM discovery-only:** not applicable — no restaurant data appears here; the card references the profile and (optionally) a dish name only.

## Next Steps

- **Depends on:** phase-05 (`buildQuestionCard`, `QuestionCard`, Zod schema), phase-06 (`POST /question-cards`, `GET /allergens`, `GET /dishes/{id}`), phase-08 (Dexie `questionCards`/`metadata` repos, `useActiveProfile`, `useOnlineStatus`), phase-09 (app shell, next-intl, `SafetyNotice`/`OfflineBanner`, `@/i18n/navigation`, semantic tokens).
- **Unblocks:** the E2E/tests phase (P1-09) drives steps 11-12 of the §17.2 happy path (open question card, copy/save); the offline QA (§17.3) verifies the last-saved card is reachable with no network.
- **Coordination:** confirm phase-08's `questionCards` row type carries the record fields (extend additively if it still reflects the leaner phase-05 `QuestionCard`); if phase-06 exports a domain→response mapper, reuse it in `toQuestionCardRecord` instead of duplicating (DRY).
