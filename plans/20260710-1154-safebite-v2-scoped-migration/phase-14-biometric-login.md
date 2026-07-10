# Phase 14 — Biometric /login (simulated first) + on-device encryption

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration study: [../migration-delta.md](../migration-delta.md) — §1 "Biometric login" row, §2.9 "Biometric device-only", §4.1 "Greenfield build strategy → mock-first (recommended)"
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — `/login` biometric unlock screen
- Depends on: `phase-04` (profile/onboarding reconciliation) — see that phase file
- Current files read: `apps/web/src/lib/dexie.ts`, `apps/web/src/lib/local-repo.ts`, `apps/web/src/lib/profile-store.ts`, `apps/web/src/components/app-shell/profile-hydrator.tsx`, `apps/web/src/app/[locale]/onboarding/page.tsx`, `apps/web/src/i18n/routing.ts`

## Overview
- **Priority:** Medium (gates first-run UX; not blocking other surfaces)
- **Current status:** Not started
- **Effort:** L
- **Risk:** High (encryption at rest + redirect-loop reconciliation touch the app's only persistence layer and its first-run gating)
- **Depends on:** phase-04
- A new `/login` screen (outside the `(app)` shell, like `/onboarding`) runs a **simulated** biometric ceremony that unlocks the existing Dexie profile, so the app is never blocked on WebAuthn availability. In the same phase, the currently-plaintext `LocalUserProfile`/`AllergyCard` IndexedDB rows move to WebCrypto encryption at rest. A real `@simplewebauthn` adapter is scoped behind a stable interface as a follow-up, with a mandatory non-biometric fallback.

## Key Insights
- **What exists to reuse:**
  - `useProfileStore` (`profile-store.ts`) is the single app-wide active-profile Zustand store: `hydrate()` reads `profileRepo.loadActiveProfile()` + `allergyCardRepo.loadAllergyCard()`, exposes `hydrated`. This is the natural place to gate on an "unlocked" flag.
  - `ProfileHydrator` (`profile-hydrator.tsx`) already owns first-run redirects: it calls `hydrate()` on mount and, once `hydrated && !profile`, `router.replace('/onboarding')` for `PROFILE_REQUIRED = ['/dishes','/allergy-card','/question-card']` (all three routes are being cut per delta §3 — this list must be rewritten regardless). Uses `@/i18n/navigation` `usePathname`/`useRouter` — the correct pattern to copy.
  - `/onboarding/page.tsx` is the template for a route **outside `(app)`**: full-height `min-h-dvh max-w-md` flex column, no `AppHeader`/`BottomNav`, `setRequestLocale(locale)` in an RSC that renders a client feature (`OnboardingWizard`). `/login` mirrors this exactly.
  - Repo layer (`local-repo.ts`) is already the sole persistence choke point: `profileRepo`/`allergyCardRepo` are the only writers/readers of `db.profiles`/`db.allergyCards`. Encryption belongs here, not in callers. Note the existing `assertNoSecrets` dev guard (`SECRET_KEY_RE`) — the WebCrypto key/credential must NOT be stored in a key it would reject, and ideally is non-extractable (never serialized).
  - Dexie versioning is additive and well-established (`dexie.ts` v1→v2→v3 via `this.version(n).stores({...})`); adding a `version(4)` migration for encrypted storage / credential metadata follows the same pattern.
- **What the code looks like TODAY:** profiles and allergy cards are written as **plaintext plain-JSON DTOs** (`db.profiles.put(profile)`, `db.allergyCards.put(card)`), indexed on `id, destinationCity, updatedAt` / `id, profileId, language, updatedAt`. `LocalUserProfile` (`packages/domain/src/types.ts:23`) and `AllergyCard` (`:131`) carry PII: `name?`, `allergies[]` with `severity`, `destinationCity`. No `/login` route, no crypto dependency, no "locked" concept exists.
- **Gotchas:**
  - Encrypting `db.profiles` breaks the `destinationCity` secondary index used by `loadActiveProfile` fingerprinting elsewhere — keep the `id` primary key + a non-PII index (e.g. `updatedAt`) in clear, encrypt only the value blob (envelope: `{ id, iv, ciphertext }`).
  - `routing.defaultLocale = 'en'`; `/login` must be locale-prefixed via `@/i18n/navigation` (delta §4.5 may later flip to `vi`).
  - Redirect-loop hazard: `/login` gating and `/onboarding` gating both live in `ProfileHydrator`; ordering must be **login → onboarding**, and `/login`/`/onboarding` themselves must be exempt from both redirects.
  - `@simplewebauthn` (browser + server) is NOT installed; adding it now is out of scope beyond the interface stub.

## Requirements
**Functional**
- New `/[locale]/login` route outside `(app)`; renders a biometric-unlock UI matching the v2 mockup with a simulated "authenticate" action.
- Simulated ceremony: on success, mark the session "unlocked", decrypt + hydrate the active profile into `useProfileStore`, then route to `/home` (or `/onboarding` if no profile exists).
- Non-biometric fallback control is always present (e.g. "continue without biometrics") so the flow is never a dead end.
- `LocalUserProfile` and `AllergyCard` are encrypted at rest in IndexedDB; reads transparently decrypt via the existing repo functions.
- Gating order in `ProfileHydrator`: if a credential/lock exists and the session is not unlocked → `/login`; else if no profile → `/onboarding`; `/login` and `/onboarding` are exempt. No redirect loops.
- New `login` i18n namespace (VI/EN) — add product-approved VI/EN keys (do not invent copy).
- A stable `BiometricAuthenticator` interface with a `SimulatedAuthenticator` implementation; a real `@simplewebauthn` implementation is a documented follow-up behind the same interface.

**Non-functional**
- All UI strings via `useTranslations` (no hardcoded copy); `@/i18n/navigation` `Link`/`useRouter` (never `next/link`; the admin token island is unaffected).
- Encryption key is device-only, non-extractable where possible; never leaves the device, never sent to any API, never logged.
- Code files < 200 lines; RSC page shell + small client feature components; YAGNI/KISS/DRY.
- Zod validation on any decrypted-blob shape boundary before it re-enters typed app state.

## Architecture
- **Route shell (RSC):** `app/[locale]/login/page.tsx` mirrors `onboarding/page.tsx` (`setRequestLocale`, `min-h-dvh max-w-md` full-height, no app chrome), renders `<LoginScreen />` client feature.
- **Client feature:** `features/login/login-screen.tsx` — `useTranslations('login')`, a large biometric affordance + fallback button, calls the authenticator, then `useRouter().replace('/home')`. Keep < 200 lines; split ceremony animation into a child if needed.
- **Auth interface:** `lib/biometric/authenticator.ts` — `interface BiometricAuthenticator { isAvailable(): Promise<boolean>; register(): Promise<void>; authenticate(): Promise<boolean> }`. `lib/biometric/simulated-authenticator.ts` implements it (resolves after a short delay / user confirm). A follow-up `webauthn-authenticator.ts` will wrap `@simplewebauthn/browser` behind the same type.
- **Crypto:** `lib/crypto/local-crypto.ts` — WebCrypto AES-GCM. Key derivation: either a non-extractable key stored in a dedicated Dexie/`metadata` slot (key material, not token-like) or derived per-unlock. Exposes `encryptJson(value)` / `decryptJson(envelope)` returning `{ iv, ciphertext }` envelopes.
- **Persistence:** `local-repo.ts` `profileRepo.saveProfile`/`loadActiveProfile` and `allergyCardRepo.save/load` wrap values with `encryptJson`/`decryptJson`; stored row becomes `{ id, <clear non-PII index fields>, blob }`. Dexie `version(4)` adds the encrypted schema (and any credential-metadata table) additively.
- **Lock state:** extend `useProfileStore` with `unlocked: boolean` + `unlock()`; `ProfileHydrator` reads it to decide `/login` vs `/onboarding` vs pass-through.
- **Data flow:** `/login` unlock → `store.unlock()` → `hydrate()` (decrypts) → redirect. `ProfileHydrator` on every route: `hydrated` → check lock/credential → `/login`; check profile → `/onboarding`; else render.

## Related Code Files
**Modify**
- `apps/web/src/lib/dexie.ts` — add `version(4)` encrypted-storage schema (+ optional credential-metadata table).
- `apps/web/src/lib/local-repo.ts` — encrypt on write / decrypt on read in `profileRepo` + `allergyCardRepo`; keep `assertNoSecrets` compatible with the key store.
- `apps/web/src/lib/profile-store.ts` — add `unlocked`/`unlock()`; `hydrate()` decrypts.
- `apps/web/src/components/app-shell/profile-hydrator.tsx` — rewrite `PROFILE_REQUIRED` (delta §3) and add login→onboarding gating with exemptions.
- `apps/web/messages/en.json` + `apps/web/messages/vi.json` — new `login` namespace (product-approved VI/EN keys).
- `apps/web/package.json` — add `@simplewebauthn/browser` (+ server if used) as the follow-up adapter dependency (optional in this phase; interface stub can land without it).

**Create**
- `apps/web/src/app/[locale]/login/page.tsx`
- `apps/web/src/features/login/login-screen.tsx`
- `apps/web/src/lib/biometric/authenticator.ts` (interface + factory)
- `apps/web/src/lib/biometric/simulated-authenticator.ts`
- `apps/web/src/lib/crypto/local-crypto.ts` (WebCrypto AES-GCM + Zod envelope schema)

**Delete**
- None (real WebAuthn adapter is additive follow-up).

## Implementation Steps
1. Add `lib/crypto/local-crypto.ts`: AES-GCM `encryptJson`/`decryptJson`, envelope `{ iv, ciphertext }`, Zod schema for decrypt-boundary validation; non-extractable key managed in a dedicated store slot.
2. Add Dexie `version(4)` in `dexie.ts` for the encrypted profile/allergy-card blob shape (+ optional credential metadata table); keep `id`/non-PII index fields in clear.
3. Wrap writes/reads in `local-repo.ts` (`profileRepo`, `allergyCardRepo`) with encrypt/decrypt; verify `assertNoSecrets` does not reject the key store.
4. Define `BiometricAuthenticator` interface + `getAuthenticator()` factory returning `SimulatedAuthenticator`; document the `@simplewebauthn` follow-up in a comment.
5. Extend `useProfileStore` with `unlocked` + `unlock()`; make `hydrate()` decrypt-aware.
6. Create `/[locale]/login/page.tsx` (RSC shell, copy `/onboarding` layout) + `features/login/login-screen.tsx` client feature with biometric affordance + mandatory non-biometric fallback, using `useTranslations('login')` and `@/i18n/navigation`.
7. Rewrite `ProfileHydrator`: new `PROFILE_REQUIRED` per delta §3; gating order login→onboarding; exempt `/login` and `/onboarding`; guard against loops.
8. Add `login` namespace to `messages/en.json` + `messages/vi.json` (product-approved keys).
9. Typecheck + lint; add unit tests for crypto round-trip and gating logic.

## Todo
- [ ] `local-crypto.ts` AES-GCM encrypt/decrypt + Zod envelope + key management
- [ ] Dexie `version(4)` encrypted schema (additive)
- [ ] `local-repo.ts` encrypt-on-write / decrypt-on-read for profile + allergy card
- [ ] `BiometricAuthenticator` interface + `SimulatedAuthenticator`
- [ ] `useProfileStore` `unlocked`/`unlock()` + decrypt-aware `hydrate()`
- [ ] `/login` RSC page + `login-screen.tsx` client feature (+ non-biometric fallback)
- [ ] `ProfileHydrator` rewrite: new `PROFILE_REQUIRED`, login→onboarding gating, exemptions
- [ ] `login` i18n namespace VI/EN
- [ ] Typecheck, lint, tests (crypto round-trip + gating)

## Success Criteria
- With no profile: `/login` (fallback) → `/onboarding`; with a profile locked: any app route redirects to `/login`, unlock → `/home`; no redirect loop between `/login`/`/onboarding` (verified manually + gating unit test).
- IndexedDB inspection shows `profiles`/`allergyCards` values are ciphertext, not plaintext `name`/`allergies`; app still reads them correctly after reload.
- `encryptJson`→`decryptJson` round-trips a `LocalUserProfile` fixture; malformed/foreign envelope fails Zod validation, not a silent wrong-type.
- No hardcoded UI strings (all via `login` namespace); only `@/i18n/navigation` used; `pnpm --filter web typecheck` and lint pass; new unit tests pass.
- Simulated authenticator is swappable: `getAuthenticator()` is the only construction site.

## Risk Assessment
- **Corrupting the only persistence layer / migration breaking existing installs** → additive `version(4)`, keep primary keys clear, one-time in-place re-encrypt on first unlock; test on a seeded DB.
- **Redirect loops** (login↔onboarding) → single gating owner (`ProfileHydrator`), explicit exempt list, ordered checks, gating unit test.
- **Lost key = unrecoverable profile** → acceptable (device-only, re-onboarding recovers); document; do not silently wipe.
- **Over-building WebAuthn now** → ship simulated behind the interface; real adapter is a separate follow-up.

## Security Considerations
- **On-device only:** AES-GCM key is device-scoped, non-extractable where the platform allows, never transmitted to any `/api` route, never logged. Reinforces the existing §10.1 do-not-store posture (`assertNoSecrets`).
- **PII:** `LocalUserProfile.name`/`allergies`/`destinationCity` and `AllergyCard.entries` move from plaintext to encrypted at rest.
- **Provenance / human-in-the-loop:** unchanged — this phase does not create or verify server data; nothing becomes auto-verified. Reporter-identity from `/login` remains an open decision (delta §4.7) and is out of scope here.
- **Zod at boundaries:** decrypted blobs are validated with a Zod schema before re-entering typed state; any auth/credential DTO exchanged with a future server adapter validates both ends.
- **Fallback safety:** non-biometric fallback must not weaken encryption — it still unlocks via the same key path, only skipping the biometric ceremony.

## Next Steps
- Unblocks a real `@simplewebauthn` adapter (`webauthn-authenticator.ts`) behind `BiometricAuthenticator` with no UI change.
- Establishes the encrypted-at-rest baseline other phases rely on when persisting user data locally.
- Feeds the delta §4.7 reporter-identity decision (device identity vs anonymous) once a credential exists.
