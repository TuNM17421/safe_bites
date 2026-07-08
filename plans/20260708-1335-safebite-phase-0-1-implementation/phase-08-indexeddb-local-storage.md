# Phase 08 — IndexedDB Local Storage (Dexie)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §10 Client Storage and Offline Specification (db name, tables, do-not-store list, offline behavior)
  - §10.1 What to store locally / **Do not store**
  - §10.2 Offline behavior (reads this phase must satisfy)
  - §7 Domain Types (`LocalUserProfile` L752-767; `DishRecommendationCard` L781-793; `LanguageCode`, `Severity`, `RecommendationStatus`)
  - §15 Question Card Templates (`buildQuestionCard` return shape — the `QuestionCard` persisted here)
  - §19 P1-02 IndexedDB local storage (acceptance block, L1759-1770)
- Depends on: `phase-02-domain-package.md` (packages/domain — `types.ts`, `schemas.ts`, `constants.ts`). This phase imports domain DTO types; it does **not** redefine them.
- Consumed by (next): `phase-09-onboarding.md` (P1-03), `phase-10-allergy-card.md` (P1-04), `phase-11-dish-guide.md` (P1-05), `phase-12-question-card.md` (P1-06), PWA/offline phase (P1-01).
- Kit: not directly consumed by this client module (seed import is server-side). See cross-cutting note #5 for the only kit-adjacent constraint that touches storage.

## Overview

- **Priority:** High (foundational — every offline read/write in Phase 1 depends on it).
- **Current status:** ✅ Done — verified 2026-07-08. `lib/dexie.ts` (`safebite_pwa_v1`, 5 tables verbatim) + `lib/local-repo.ts` (profile/allergy-card/question-card/saved-dish/metadata repos + `clearAllLocalData` + `assertNoSecrets`). 8 Vitest cases over `fake-indexeddb` pass: save/load/delete profile (+active pointer), allergy card, last question card (pointer), **unknown-status dish survives the round-trip unchanged**, clear-all empties every table, secret-like keys rejected, and a source scan confirms no localStorage/cookie usage. typecheck + lint clean.
- **Brief description:** Create the client-only Dexie database `safebite_pwa_v1` with the five tables from §10, plus typed repository functions (save / load / delete / clear-all) for the active profile, allergy card, last question card, and saved dish recommendation cards. Enforce the §10.1 "Do not store" list. Persist only already-serialized plain-JSON DTOs so offline reads faithfully reproduce API output — including honest `Unknown` statuses.

## Key Insights

- **Persistence layer only.** This phase ships the async repository API and schema; the offline *UI* (OfflineBanner, service worker, install education) belongs to the PWA phase. Here we only guarantee that reads succeed with no network and that writes accept the exact domain DTOs.
- **Store serialized DTOs, never raw Prisma/domain class instances.** Timestamps are ISO strings; `confidence` on a saved card is the `"low"|"medium"|"high"` union (not a number). This aligns with cross-cutting note #5: the recommendations API already maps Prisma `Decimal` → plain number and bucket string *before* the client caches anything, so Dexie never sees a `Decimal` or `Date` object.
- **Unknown must survive a round-trip.** Cross-cutting note #3 (no dish carries tree-nut/soy risk → resolves `unknown`) plus safety rule "Unknown MUST NEVER become Suitable": `loadSavedDishes` must return `unknown`-status cards unchanged and MUST NOT filter, hide, or upgrade them. Staleness may be *flagged* (`stale: true`) but never changes `status`.
- **Every saved row keeps its evidence fields.** A `savedDishes` row is a full `DishRecommendationCard`, so `source`, `confidence`, `reason`, `action`, `lastCheckedAt` persist. Do not slim rows to "save space" — offline rendering needs the caveat/reason/action copy, and the "Suitable + caveat" rule (§13) can only render if `action`/`reason` are stored.
- **"Active profile" needs a pointer.** The `profiles` table PK is `id`; the app resolves "the current profile" via a `metadata` row `activeProfileId`. Same pattern for `lastQuestionCardId` → O(1) "last question card" lookup, deterministic rather than an `orderBy` scan.
- **Client-only module.** Dexie needs `IndexedDB`. Guard with `import 'client-only'` so an accidental import from a Server Component fails at build. Server code (API routes, RSC) never imports `dexie.ts`.
- **No user-facing copy lives here.** Offline/disclaimer strings are next-intl message keys (owned by the i18n phase), not this module. `dexie.ts`/`local-repo.ts` are still scanned by `scripts/assert-no-unsafe-copy.ts` (it scans `apps/web/src`), so keep them free of any status/marketing wording.
- **File-size rule (<~200 lines).** Split responsibilities: `dexie.ts` = DB subclass + row types + schema; `local-repo.ts` = the repository functions. Both stay well under 200 lines and keep schema/behavior DRY.

## Requirements

### Functional

1. Dexie DB named exactly `safebite_pwa_v1`, `version(1)` with the five §10 tables and index strings **verbatim**:
   - `profiles: "id, destinationCity, updatedAt"`
   - `allergyCards: "id, profileId, language, updatedAt"`
   - `questionCards: "id, profileId, dishId, targetLanguage, createdAt"`
   - `savedDishes: "dishId, status, savedAt, lastCheckedAt"`
   - `metadata: "key, updatedAt"`
2. Profile repo: `saveProfile`, `loadActiveProfile`, `getProfile(id)`, `deleteProfile(id)` (clears `activeProfileId` pointer when deleting the active one).
3. Allergy-card repo: `saveAllergyCard`, `loadAllergyCard(profileId)`, `deleteAllergyCard(id)`.
4. Question-card repo: `saveLastQuestionCard`, `loadLastQuestionCard`, `clearLastQuestionCard`.
5. Saved-dish repo: `saveDish`, `getSavedDish(dishId)`, `loadSavedDishes()`, `deleteSavedDish(dishId)`. Loads return `unknown`-status cards unchanged.
6. Metadata repo: `getMetadata<T>(key)`, `setMetadata(key, value)`.
7. `clearAllLocalData()` empties all five tables in one transaction.
8. All writes accept only the domain DTO types from Phase 2 (`LocalUserProfile`, `QuestionCard`, `DishRecommendationCard`) plus small local row wrappers.

### Non-functional

- Client-only (`import 'client-only'`); zero use of `localStorage` / `sessionStorage` / `document.cookie` (§10.1).
- No secrets/credentials persisted (§10.1 "no access tokens"). Runtime dev-guard on the arbitrary-value writer (`setMetadata`).
- Deterministic, race-safe writes (pointer updates share the same `readwrite` transaction as the row write).
- Each impl file < ~200 lines; functions grouped by domain object (KISS/DRY).
- Unit-testable in Node via `fake-indexeddb` (Vitest).

## Architecture

**System design.** Two files: `lib/dexie.ts` defines the typed `SafeBiteDB extends Dexie` singleton (`export const db`); `lib/local-repo.ts` exposes namespaced repositories (`profileRepo`, `allergyCardRepo`, `questionCardRepo`, `savedDishRepo`, `metadataRepo`) plus `clearAllLocalData`. Everything else in the app imports repositories, not `db` directly.

**Component interactions.**
- Onboarding / profile store (Zustand) → `profileRepo.saveProfile` on create/edit; hydrates from `loadActiveProfile()` on mount.
- Allergy-card feature → `allergyCardRepo` (offline-readable per §10.2).
- Question-card feature → `questionCardRepo.saveLastQuestionCard` after `buildQuestionCard`; reloads last card offline.
- Dish guide → after a `/recommendations/dishes` fetch, `savedDishRepo.saveDish` caches the serialized card; offline it renders from `loadSavedDishes()`.
- Profile "delete all my data" → `clearAllLocalData()`.

**Data flow (write → read).**
```
API DTO (already Decimal→number, Date→ISO)  ──►  repo.save*()  ──►  Dexie table (plain JSON)
                                                                         │
offline read  ◄──  repo.load*()  ◄───────────────────────────────────────┘   (status unchanged; may add stale:true)
```

Row types (local wrappers, minimal):
```ts
// dexie.ts (illustrative)
import 'client-only';
import Dexie, { type Table } from 'dexie';
import type { LocalUserProfile, QuestionCard, DishRecommendationCard, LanguageCode } from '@safebite/domain';

export interface StoredAllergyCard {
  id: string; profileId: string; language: LanguageCode;
  text: Record<LanguageCode, string>; updatedAt: string; // + sections per domain type
}
export interface SavedDish extends DishRecommendationCard { savedAt: string } // PK = dishId
export interface MetadataRow { key: string; value: unknown; updatedAt: string }

export class SafeBiteDB extends Dexie {
  profiles!: Table<LocalUserProfile, string>;
  allergyCards!: Table<StoredAllergyCard, string>;
  questionCards!: Table<QuestionCard, string>;
  savedDishes!: Table<SavedDish, string>;      // keyed by dishId
  metadata!: Table<MetadataRow, string>;
  constructor() {
    super('safebite_pwa_v1');
    this.version(1).stores({
      profiles: 'id, destinationCity, updatedAt',
      allergyCards: 'id, profileId, language, updatedAt',
      questionCards: 'id, profileId, dishId, targetLanguage, createdAt',
      savedDishes: 'dishId, status, savedAt, lastCheckedAt',
      metadata: 'key, updatedAt',
    });
  }
}
export const db = new SafeBiteDB();
```

## Related Code Files

### To create
- `apps/web/src/lib/dexie.ts` — `SafeBiteDB` subclass, row types, `version(1)` schema, `db` singleton, metadata-key constants (`ACTIVE_PROFILE_ID`, `LAST_QUESTION_CARD_ID`).
- `apps/web/src/lib/local-repo.ts` — repository functions + `clearAllLocalData` + `assertNoSecrets` guard.
- `apps/web/src/tests/unit/local-repo.test.ts` — Vitest suite over `fake-indexeddb`.

### To modify
- `apps/web/package.json` — add deps `dexie`, `client-only`; dev deps `fake-indexeddb` (+ Vitest if not already present from Phase 2/setup).

### To delete
- None.

## Implementation Steps

1. Add `dexie` + `client-only` to `apps/web` deps and `fake-indexeddb` to dev deps; confirm Vitest config picks up `src/tests/unit`.
2. Create `dexie.ts`: `import 'client-only'`, define row wrapper types, `SafeBiteDB` with the five verbatim table strings under `version(1)`, export `db` and the metadata-key constants.
3. In `local-repo.ts`, implement `metadataRepo.getMetadata<T>`/`setMetadata` first (other repos reuse it for pointers). Add `assertNoSecrets(value)` — dev-only throw if any key matches `/token|secret|password|cookie|sbt_admin|authorization/i`; call it inside `setMetadata` and `saveProfile`.
4. Implement `profileRepo`: `saveProfile` (in one `rw` txn: `put` profile + `setMetadata(ACTIVE_PROFILE_ID, profile.id)`), `loadActiveProfile` (read pointer → `get`), `getProfile`, `deleteProfile` (delete + clear pointer if it was active).
5. Implement `allergyCardRepo`: `saveAllergyCard` (`put`), `loadAllergyCard(profileId)` (query by `profileId`, newest `updatedAt`), `deleteAllergyCard`.
6. Implement `questionCardRepo`: `saveLastQuestionCard` (txn: `put` card + `setMetadata(LAST_QUESTION_CARD_ID, card.id)`), `loadLastQuestionCard` (pointer → `get`), `clearLastQuestionCard`.
7. Implement `savedDishRepo`: `saveDish` (spread card + `savedAt`, `put` keyed by `dishId`), `getSavedDish`, `loadSavedDishes` (return all, **no status filtering/mutation**; optional `stale` flag via `lastCheckedAt` TTL helper — never touches `status`), `deleteSavedDish`.
8. Implement `clearAllLocalData()` — single `rw` transaction over all five tables calling `.clear()`.
9. Write unit tests (step-by-step in Success Criteria) importing `fake-indexeddb/auto`; run `pnpm --filter web test`.
10. Run `pnpm --filter web tsc --noEmit` and the copy guard `scripts/assert-no-unsafe-copy.ts` to confirm no type or forbidden-copy regressions.

## Todo List

- [x] Add `dexie`, `client-only`, `fake-indexeddb` deps to `apps/web`
- [x] `dexie.ts`: client-only guard, row types, `SafeBiteDB`, `version(1)` schema (verbatim strings), `db` singleton, metadata-key constants
- [x] `metadataRepo` (`getMetadata`/`setMetadata`) + `assertNoSecrets` guard
- [x] `profileRepo` save/load-active/get/delete with `activeProfileId` pointer
- [x] `allergyCardRepo` save/load(profileId)/delete
- [x] `questionCardRepo` save-last/load-last/clear with `lastQuestionCardId` pointer
- [x] `savedDishRepo` save/get/load-all(no filtering)/delete
- [x] `clearAllLocalData` transactional clear of all five tables
- [x] Unit tests over `fake-indexeddb` covering all acceptance + Unknown round-trip + no-secrets
- [x] `tsc --noEmit` clean + copy-guard passes

## Success Criteria

**Definition of done — mirrors §19 P1-02 acceptance:**
- Can save / load / delete a local profile.
- Can save / load an allergy card.
- Can save / load the last question card.
- Can clear all local data.

**Additional (safety-derived):**
- A saved `unknown`-status dish card is returned by `loadSavedDishes` with `status === 'unknown'` (never dropped, never `'suitable'`).
- Saved dish rows retain `source`, `confidence`, `reason`, `action`, `lastCheckedAt`.
- No `localStorage`/`sessionStorage`/`document.cookie` reference exists in `dexie.ts` or `local-repo.ts`.
- `setMetadata` throws when passed an object containing a token-like key.

**How to validate (Vitest + `fake-indexeddb`):**
1. `saveProfile` then `loadActiveProfile` returns deep-equal profile; `deleteProfile` → `loadActiveProfile` is `undefined`.
2. `saveAllergyCard` then `loadAllergyCard(profileId)` returns it; deleting removes it.
3. `saveLastQuestionCard` twice with different ids → `loadLastQuestionCard` returns the second (pointer updated).
4. `saveDish` an `unknown` card → `loadSavedDishes()[0].status === 'unknown'` and all evidence fields present.
5. Populate all tables → `clearAllLocalData()` → every `db.<table>.count()` is `0`.
6. `setMetadata('x', { accessToken: 'y' })` throws.
7. A source-scan assertion (or the shared copy-guard run) confirms zero `localStorage`/`sessionStorage` usages in this module.
8. `pnpm --filter web tsc --noEmit` passes; `scripts/assert-no-unsafe-copy.ts` passes.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| `dexie.ts` imported by a Server Component / API route | Build/runtime crash (no `IndexedDB`) | `import 'client-only'` at top; only client components/stores import repositories. |
| Raw Prisma `Decimal`/`Date` cached (cross-cutting #5) | Broken JSON in IDB, NaN on read | Repos accept only serialized API DTOs; ISO-string timestamps; add a JSDoc contract + test asserting `typeof savedAt === 'string'`. |
| `loadSavedDishes` accidentally filters/upgrades `unknown` | Safety violation (Unknown→hidden/Suitable) | Explicit test #4; no filtering in the query; staleness only sets `stale`, never `status`. |
| Non-atomic pointer + row writes | Orphaned/stale `activeProfileId` | Wrap row `put` + `setMetadata` in one `db.transaction('rw', …)`. |
| Schema string typo vs §10 | Wrong indexes, silent query bugs | Copy strings verbatim from §10; assert in a test that `db.savedDishes` is keyed by `dishId`. |
| Future field additions | Migration needed | Reserve `version(2)` upgrade path; document that additive fields need no migration, index changes do. |

## Security Considerations

- **Do-not-store list (§10.1):** module writes exclusively to IndexedDB via Dexie — never `localStorage`/`sessionStorage`/cookies. `assertNoSecrets` blocks token-like keys reaching `metadata`/`profiles`. Admin auth stays in the httpOnly `sbt_admin` cookie (server-only); this client module never reads or writes it.
- **No profile in URL (§10.1):** repositories return in-memory objects for Zustand/state use; profile data is never serialized into query strings or route params. App navigation uses `@/i18n/navigation` (locale routing), not profile-bearing URLs.
- **Data minimization / user control:** all persistence is device-local (no account in Phase 1); `clearAllLocalData()` gives the user a hard delete of every local record.
- **Safety copy:** no status/marketing/forbidden strings in this module; offline and disclaimer copy are next-intl keys owned elsewhere. Files remain covered by `scripts/assert-no-unsafe-copy.ts`.
- **OSM discovery-only:** not applicable — restaurants are never surfaced in Phase 1 UX and are never cached here; `savedDishes` holds dish recommendation cards only.

## Next Steps

- **Unblocked by:** Phase 2 domain package must export `LocalUserProfile`, `QuestionCard`, `DishRecommendationCard`, `LanguageCode`, `RecommendationStatus`.
- **Unblocks:** Onboarding (P1-03, persists profile + allergy card), Allergy card (P1-04), Question card (P1-06), Dish guide (P1-05, caches recommendations), and the PWA/offline phase (P1-01), whose §10.2 offline reads all depend on these repositories.
- **Follow-up:** Zustand profile store hydration from `loadActiveProfile()` and TanStack Query offline-cache wiring for saved dishes are implemented in their respective feature phases, consuming this API unchanged.
