# Phase 09 — Onboarding, Profile & Allergy Card

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §12.2 `/onboarding` flow + acceptance (lines 1322–1352)
  - §12.7 `/allergy-card` (lines 1417–1429)
  - §12.8 `/profile` (lines 1431–1439)
  - §7 `LocalUserProfile` domain type (lines 752–767)
  - §10 Dexie tables + §10.2 offline behavior (lines 1180–1240)
  - §13 Components (`SafetyNotice`, `AllergyCardDisplay`, `LanguageToggle`) (lines 1459–1490)
  - §14 disclaimer / safety copy keys (lines 1494–1527)
  - §19 P1-03 onboarding, P1-04 allergy card, P1-07 profile (lines 1772–1798, 1830–1840)
  - §17.2 E2E happy path steps 1–8, 13–14 (lines 1616–1637)
- Depends on (sibling phase files in this plan dir — exact names may vary, see `plan.md` index):
  - `phase-05-*` — domain package (`packages/domain/src/types.ts` `LocalUserProfile`, `copy.ts`/i18n safety strings)
  - `phase-06-*` — `/api/v1` routes: `client-config`, `profile-templates`, `allergens`
  - `phase-08-*` — Dexie schema + repository functions (`saveProfile`, `getProfile`, `saveAllergyCard`, `getAllergyCard`, `clearAllLocalData`)
- Seed kit: `osm_overpass_seed_kit/schemas/profiles.csv` (6 profile templates), `osm_overpass_seed_kit/schemas/ingredients_schema.csv` (allergen tags — see note #3 coverage gap)

## Overview

- **Priority:** High (core Phase 1 user entry point; unblocks dish guide and question card UX).
- **Current status:** ✅ Done — verified 2026-07-08 (typecheck/lint/test + production build; all `/onboarding`, `/allergy-card`, `/profile` routes SSG and SSR-render 200 with no crash). Built: TanStack Query `Providers`, Zustand `profile-store` + `ProfileHydrator` (hydrate + no-profile guard on profile-required routes), `SafetyNotice`, the 6-step wizard (templates/severity/cross-contact/city/language/disclaimer) with a transient draft store (never in the URL), `build-profile`/`build-allergy-card`, `AllergyCardDisplay` (offline, EN+VI + severity/cross-contact + last-updated), `ProfileView` (restart + clear-all), and onboarding/allergyCard/profile/severity i18n keys. Allergen picker renders the full allergy-type catalog incl. **tree-nut/soy** (via `ALLERGY_ALLERGEN_IDS`); finish saves profile + allergy card to Dexie and `router.replace('/home', {locale})` with no query params. Cross-phase: added `AllergyCard`/`AllergyCardEntry` + `ALLERGY_ALLERGEN_IDS` to `@safebite/domain`; Dexie `StoredAllergyCard` now = domain `AllergyCard` (structured `entries`). **Note:** the interactive click-through E2E (select → finish → Dexie write → redirect) is exercised by the Playwright happy path in phase 13, per this phase's validation plan.
- **Brief description:** Build the local-first onboarding wizard (§12.2), the offline allergy card page (§12.7), and the profile management page (§12.8). Establish the app-wide Zustand active-profile store hydrated from Dexie, and the shared `SafetyNotice` component. Everything is account-free and offline-capable; no profile data ever touches the URL.

## Key Insights

- **Account-free, local-first.** The entire flow writes to IndexedDB only. There is no server-side profile persistence in Phase 1 — the recommendation API (§9.5) takes the profile in a POST body, not from a stored session.
- **No profile in the URL (hard rule, §12.2 + §10.1 + §20).** Wizard draft state lives in a transient in-memory store; the final redirect to `/home` uses `router.replace` with no query params. Never serialize profile/allergen selections into query strings or path segments.
- **Allergen catalog must be honest, never coverage-filtered (note #3).** Seed dishes expose only 10 risk columns — no tree-nut, no soy risk data. Onboarding MUST still let users select tree-nut and soy; these resolve to `unknown` downstream, which the risk engine keeps safe-by-default. The client must render the *full* allergen catalog and must NOT hide an allergen because "no dishes cover it." If `/api/v1/allergens` does not surface `treenut`, that is a seed/allergen-catalog gap to fix in phase-04/phase-06 — flag it, do not paper over it by dropping the allergen.
- **Two allergen-carrying structures in `LocalUserProfile` (§7).** `selectedProfileIds` holds *all* chosen templates (including non-allergy: halal, no-beef, weight-loss, picky). `allergies[]` holds only allergy-type allergens with `{severity, crossContactSensitive}`. Religious/diet/preference constraints need no severity — the risk engine handles them via §8.3 pseudo-allergens (pork/beef/alcohol/high_calorie/strong_smell). So the severity and cross-contact steps iterate only allergy-type allergens.
- **`crossContactSensitive` is a tri-state:** `boolean | "not_sure"` (§7). The E2E path selects "yes" (§17.2 step 5). Default to `"not_sure"` (conservative) if the user skips.
- **Language step is dual-purpose (next-intl override).** Choosing the language sets `profile.language` (data) *and* switches the next-intl UI locale. Redirect must use `@/i18n/navigation` so `/home` lands under the correct locale prefix (`/en` or `/vi`). The question-card `targetLanguage` is independent and is NOT set here.
- **Allergy card must be a self-contained offline snapshot.** At save time, resolve and store bilingual allergen names (EN + VI) into the card record so `/allergy-card` renders with zero network (§10.2, §12.7). Severity/cross-contact labels and the disclaimer are static next-intl chrome (bundled → offline-safe); the offline-availability label and last-updated come from the stored record.
- **Static chrome vs data-driven text.** Step labels, severity labels, cross-contact labels, disclaimer, offline label → next-intl `useTranslations()`. Template names, allergen names, city names → data-driven `Record<'en'|'vi',string>` from the API. Do not put allergen names into message files.
- **Decimal note #5** does not apply here: `profile-templates`/`allergens`/`client-config` payloads consumed by this phase carry no Prisma `Decimal` fields.

## Requirements

### Functional

1. `/onboarding` runs the 7-step flow (§12.2): (1) choose profile templates and/or standalone allergens, (2) set severity per allergy allergen, (3) set cross-contact sensitivity, (4) choose destination city, (5) choose language, (6) accept safety disclaimer, (7) save local profile + allergy card, redirect `/home`.
2. Allergen selection includes tree-nut and soy and every catalog allergen; nothing is filtered by dish coverage (note #3).
3. Finishing requires no account; the disclaimer must be explicitly accepted before save is enabled (`safetyAcceptedAt` recorded).
4. On finish: assemble a valid `LocalUserProfile` (§7), build an `AllergyCard` snapshot, persist both via the phase-08 Dexie repo, set them in the Zustand store, then redirect `/home`.
5. `/allergy-card` (§12.7) shows active allergies/constraints, severity, cross-contact, EN **and** VI text, the safety disclaimer, an offline-availability label, and a last-updated timestamp — sourced from Dexie/store (works offline).
6. `/profile` (§12.8) shows the active profile summary, offers "restart onboarding" (route to `/onboarding`), and "clear local + offline data" (wipe Dexie + reset store).
7. `SafetyNotice` component renders the §14 disclaimer via next-intl and is used on the onboarding disclaimer step, the allergy card, and `/home`.
8. Guard: `(app)` routes with no local profile link/redirect to `/onboarding` (§12.4 empty-state pattern).

### Non-functional

- No profile data in query string / path (§12.2, §20).
- Offline: `/allergy-card` and `/profile` render fully from IndexedDB after first visit (§10.2).
- No forbidden safety copy anywhere; only allowed status labels (§16 gate `copy:check`).
- Client interactivity components use `'use client'`; navigation via `@/i18n/navigation` (never `next/link` / `next/navigation`).
- Each implementation file < ~200 lines; wizard split into step components (KISS/DRY).

## Architecture

**System design.** Server components render thin route shells; the wizard and card/profile views are client components. Onboarding *reference data* (`profile-templates`, `allergens`, `client-config`) is fetched via TanStack Query (phase-06 endpoints). *Draft* selections live in a transient client store during the wizard and are discarded on completion. *Persisted* state (final profile + allergy card) lives in Dexie and is mirrored into an app-wide Zustand store for synchronous reads across `/home`, `/allergy-card`, `/profile`.

**Component interactions.**
- `use-onboarding-data.ts` (TanStack Query) → templates/allergens/client-config.
- `onboarding-wizard.tsx` (controller) → renders `steps/*`, holds draft via `use-onboarding-draft.ts` (Zustand, transient).
- On finish → `build-profile.ts` (draft → `LocalUserProfile`) → `build-allergy-card.ts` (profile + allergen metadata → `AllergyCard` snapshot) → phase-08 repo `saveProfile`/`saveAllergyCard` → `profile-store.ts` `setProfile` → `useRouter().replace('/home')`.
- `profile-store.ts` (Zustand) hydrates from Dexie on app mount via a `ProfileHydrator` in `(app)/layout.tsx`; `/allergy-card`, `/profile`, `/home` read from it.

**Data flow.**
```
[API: templates/allergens/client-config] --TanStack Query--> Wizard draft (transient, in-memory)
        Wizard finish --> build-profile --> build-allergy-card
                              |                    |
                    Dexie.saveProfile     Dexie.saveAllergyCard   (phase-08 repo)
                              \____________________/
                                     |
                          Zustand profile-store (active profile + card)
                                     |
              /home   /allergy-card (offline)   /profile (offline)
```

## Related Code Files

### To create

- `apps/web/src/app/(app)/onboarding/page.tsx` — server shell; renders `<OnboardingWizard/>` (optionally prefetches reference data).
- `apps/web/src/features/onboarding/onboarding-wizard.tsx` — `'use client'` step controller.
- `apps/web/src/features/onboarding/use-onboarding-draft.ts` — transient Zustand draft store (selections, current step).
- `apps/web/src/features/onboarding/use-onboarding-data.ts` — TanStack Query hooks (templates, allergens, client-config).
- `apps/web/src/features/onboarding/steps/step-templates.tsx` — choose templates + standalone allergens (full catalog, incl. tree-nut/soy).
- `apps/web/src/features/onboarding/steps/step-severity.tsx` — severity per allergy allergen.
- `apps/web/src/features/onboarding/steps/step-cross-contact.tsx` — tri-state cross-contact per allergy allergen.
- `apps/web/src/features/onboarding/steps/step-city.tsx` — destination city (from `client-config`, default `hanoi`).
- `apps/web/src/features/onboarding/steps/step-language.tsx` — language + next-intl locale switch.
- `apps/web/src/features/onboarding/steps/step-disclaimer.tsx` — `SafetyNotice` + accept checkbox + finish.
- `apps/web/src/features/onboarding/build-profile.ts` — draft → `LocalUserProfile` (id, timestamps, `safetyAcceptedAt`, allergy/template split).
- `apps/web/src/features/allergy-card/build-allergy-card.ts` — pure builder → `AllergyCard` snapshot (resolves bilingual allergen names).
- `apps/web/src/features/allergy-card/allergy-card-display.tsx` — `AllergyCardDisplay` component.
- `apps/web/src/app/(app)/allergy-card/page.tsx` — server shell → client display reading store.
- `apps/web/src/app/(app)/profile/page.tsx` — server shell → client `<ProfileView/>`.
- `apps/web/src/features/profile/profile-view.tsx` — view / restart onboarding / clear local+offline.
- `apps/web/src/lib/profile-store.ts` — app-wide Zustand store (`profile`, `allergyCard`, `hydrated`, `hydrate()`, `setProfile()`, `clearAll()`).
- `apps/web/src/components/app-shell/profile-hydrator.tsx` — `'use client'` mount-time `hydrate()` trigger.
- `apps/web/src/components/safety/safety-notice.tsx` — `SafetyNotice` (next-intl disclaimer).

### To modify

- `apps/web/messages/en.json`, `apps/web/messages/vi.json` — add `onboarding.*`, `allergyCard.*`, `profile.*` static keys; reuse shared `safety.disclaimer` / `common.offlineNotice` keys (added by domain/i18n phase).
- `apps/web/src/app/(app)/layout.tsx` — mount `<ProfileHydrator/>`; add no-profile guard/redirect to `/onboarding`.
- `packages/domain/src/types.ts` — add `AllergyCard` + `AllergyCardEntry` shared types (coordinate with phase-05; consumed by phase-08 repo and this phase).

### To delete

- None.

## Implementation Steps

1. Add `AllergyCard` / `AllergyCardEntry` types to `packages/domain/src/types.ts` (coordinate with phase-05): entry = `{ allergenId; name: Record<'en'|'vi',string>; severity?: Severity; crossContact: boolean | "not_sure"; isConstraintOnly: boolean }`; card = `{ id; profileId; language: LanguageCode; entries; createdAt; updatedAt }`.
2. Create `profile-store.ts` (Zustand): active `profile`/`allergyCard`, `hydrated` flag, `hydrate()` (calls phase-08 `getProfile`/`getAllergyCard`), `setProfile()`, `clearAll()` (calls phase-08 `clearAllLocalData` + resets).
3. Create `profile-hydrator.tsx` and mount it in `(app)/layout.tsx`; add the no-profile guard (if `hydrated && !profile` and route ≠ onboarding → link/redirect to `/onboarding`).
4. Create `safety-notice.tsx` using `useTranslations('safety')` → `t('disclaimer')`. Reuse everywhere the disclaimer is required.
5. Create `use-onboarding-data.ts`: TanStack Query hooks for `GET /api/v1/profile-templates`, `GET /api/v1/allergens`, `GET /api/v1/client-config`.
6. Create `use-onboarding-draft.ts`: transient store — `selectedProfileIds`, `selectedAllergenIds`, per-allergen `severity`/`crossContact`, `destinationCity`, `language`, `name?`, `accepted`, `step`, plus setters and `reset()`. Never persisted.
7. Build `step-templates.tsx`: list templates (data-driven names) + full allergen catalog (render ALL, incl. tree-nut/soy; no coverage filter). Map allergy templates → implied allergen ids; keep non-allergy templates in `selectedProfileIds` only.
8. Build `step-severity.tsx` and `step-cross-contact.tsx`: iterate only allergy-type selected allergens; severity ∈ `{mild,moderate,severe,anaphylaxis_risk}`; cross-contact ∈ `{yes,no,not_sure}` → `true|false|"not_sure"`.
9. Build `step-city.tsx` (cities from `client-config`, default `hanoi`) and `step-language.tsx` (sets `language` + switches next-intl locale).
10. Build `step-disclaimer.tsx`: render `<SafetyNotice/>` + explicit accept checkbox; "Finish" disabled until accepted.
11. Implement `build-profile.ts`: draft → `LocalUserProfile` (`id = crypto.randomUUID()`, `createdAt/updatedAt/safetyAcceptedAt = now`, `offlineEnabled = true`, split `selectedProfileIds` vs `allergies[]`).
12. Implement `build-allergy-card.ts`: pure fn resolving each constraint to bilingual name + severity/cross-contact snapshot (constraint-only entries for religious/diet templates flagged `isConstraintOnly`).
13. Wire `onboarding-wizard.tsx` finish handler: `build-profile` → `build-allergy-card` → Dexie `saveProfile` + `saveAllergyCard` → store `setProfile` → `useRouter().replace('/home')` (from `@/i18n/navigation`, no query params).
14. Build `allergy-card-display.tsx` + `(app)/allergy-card/page.tsx`: render entries EN+VI, severity, cross-contact, `<SafetyNotice/>`, offline-availability label, last-updated (`updatedAt`); read from store (offline-safe).
15. Build `profile-view.tsx` + `(app)/profile/page.tsx`: summary, "Restart onboarding" → `/onboarding`, "Clear local + offline data" → `store.clearAll()` then route to `/onboarding` or `/`.
16. Add `onboarding.*` / `allergyCard.*` / `profile.*` keys to `messages/en.json` + `vi.json`.
17. Run `pnpm typecheck`, `pnpm lint`, `pnpm copy:check`; fix.

## Todo List

- [x] Add `AllergyCard`/`AllergyCardEntry` types to domain (`types.ts`).
- [x] `profile-store.ts` Zustand store with `hydrate`/`setProfile`/`clearAll`.
- [x] `profile-hydrator.tsx` + mount in `(app)/layout.tsx` + no-profile guard.
- [x] `safety-notice.tsx` (`SafetyNotice`).
- [x] `use-onboarding-data.ts` (TanStack Query: templates/allergens/client-config).
- [x] `use-onboarding-draft.ts` (transient draft store).
- [x] `step-templates.tsx` (full allergen catalog, tree-nut/soy included, no coverage filter).
- [x] `step-severity.tsx` + `step-cross-contact.tsx` (allergy allergens only).
- [x] `step-city.tsx` + `step-language.tsx` (locale switch).
- [x] `step-disclaimer.tsx` (accept gate).
- [x] `build-profile.ts` (draft → `LocalUserProfile`).
- [x] `build-allergy-card.ts` (bilingual snapshot).
- [x] `onboarding-wizard.tsx` finish → save → `router.replace('/home')`.
- [x] `allergy-card-display.tsx` + `(app)/allergy-card/page.tsx`.
- [x] `profile-view.tsx` + `(app)/profile/page.tsx`.
- [x] i18n keys in `messages/en.json` + `vi.json`.
- [x] typecheck / lint / copy:check pass.

## Success Criteria

**Definition of done** (mirrors §12.2 + §19 P1-03/04/07):

- User completes onboarding with no account; disclaimer must be accepted before finish.
- Profile saved to IndexedDB; allergy card generated and saved; user redirected to `/home`.
- Profile data appears in **no** query string or path segment.
- Allergen selection lets the user pick tree-nut and soy (they later render honest `Unknown`, never hidden).
- `/allergy-card` shows constraints EN/VI, severity, cross-contact, disclaimer, offline-availability label, last-updated — and renders with network disabled.
- `/profile` shows the active profile, can restart onboarding, and can clear local + offline data.

**How to validate:**

- Manual: run the §17.2 E2E path steps 1–8 (peanut → anaphylaxis → cross-contact yes → Hanoi → accept → land `/home`) and 13–14 (open allergy card, confirm offline-available label). Confirm `treenut`/`soy` are selectable in step 1.
- DevTools: after finish, IndexedDB `safebite_pwa_v1` has `profiles` + `allergyCards` rows; URL for `/home` has no profile params.
- Offline (DevTools → Offline): reload → `/allergy-card` and `/profile` still render from IndexedDB.
- `pnpm typecheck && pnpm lint && pnpm copy:check` pass.
- Playwright happy path (owned by test phase) exercises this flow end-to-end.

## Risk Assessment

- **Allergen catalog missing tree-nut (note #3).** `/api/v1/allergens` may not return `treenut` if the seed has no such tag. *Mitigation:* onboarding renders the full catalog and never coverage-filters; flag the catalog gap to phase-04/phase-06 (add a canonical `treenut` allergen row) so the user can actually pick it. Do not hardcode/hide.
- **Hydration race / flash of no-profile.** Reading Dexie is async; guarding too early could bounce a returning user to `/onboarding`. *Mitigation:* gate the guard on `hydrated === true`; show a neutral loading state until then.
- **Profile leaking into URL.** Easy to accidentally push draft state as query params. *Mitigation:* transient in-memory draft only; final nav via `router.replace` with a bare path; add a lint/review check.
- **Allergy card stale after profile edit.** Editing = restart onboarding → must regenerate the card. *Mitigation:* the finish handler always rebuilds + re-saves the card and bumps `updatedAt`.
- **Wizard file bloat.** *Mitigation:* one file per step + a thin controller; shared logic in `build-profile`/`build-allergy-card`.

## Security Considerations

- **Local-first, no accounts:** all data is device-local IndexedDB; nothing sent to the server except transient POST bodies from later phases (dishes/question-card). No tokens in `localStorage`; no profile in URL (§10.1).
- **Safety copy:** only allowed status labels (Suitable, Ask First, Risky, Avoid, Unknown); the §14 disclaimer is mandatory on the disclaimer step, allergy card, and home; no forbidden phrases ("Guaranteed Safe", "100% Safe", etc.) — enforced by `scripts/assert-no-unsafe-copy.ts` / `pnpm copy:check`.
- **Unknown stays honest:** onboarding never suppresses an allergen for lack of coverage; downstream `unknown` must never become `suitable` (§8.2) — this phase's contract is "select all, hide none."
- **Clear-data completeness:** "Clear local + offline data" must wipe every Dexie table (profiles, allergyCards, questionCards, savedDishes, metadata) via the phase-08 repo, leaving no residual PII on the device.
- **OSM discovery-only:** this phase surfaces no restaurant data whatsoever — compliant with the "restaurants not shown in Phase 1 public UX" rule by omission.

## Next Steps

- **Depends on:** phase-05 (domain `LocalUserProfile` + safety copy keys), phase-06 (`profile-templates`/`allergens`/`client-config` endpoints), phase-08 (Dexie schema + repo functions).
- **Unblocks:** dish guide UI (phase-10, consumes the active profile from `profile-store` for `POST /recommendations/dishes`), question-card UI (phase-11, reads active profile), `/home` summary, and the Playwright happy-path E2E (test phase).
- **Cross-phase flag:** confirm the allergen catalog includes `treenut` (and `soy`) so onboarding selection is genuinely available (note #3) — raise with phase-04/phase-06 owners.
