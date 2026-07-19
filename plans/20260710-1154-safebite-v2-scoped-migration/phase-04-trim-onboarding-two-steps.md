# Phase 04 — Trim onboarding to 2 steps

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta: [../migration-delta.md](../migration-delta.md) — §1 rows "Onboarding 1/2" & "Onboarding 2/2"; §4 decision #8 (severity/cross-contact placement)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` (Onboarding 1/2 allergens, 2/2 warning)
- Current wizard: `apps/web/src/features/onboarding/onboarding-wizard.tsx`
- Steps: `apps/web/src/features/onboarding/onboarding-steps.tsx`
- Draft store: `apps/web/src/features/onboarding/use-onboarding-draft.ts`
- Profile builder: `apps/web/src/features/onboarding/build-profile.ts`
- Profile surface: `apps/web/src/features/profile/profile-view.tsx`
- Route gate: `apps/web/src/components/app-shell/profile-hydrator.tsx`

## Overview
- **Priority:** High (unblocks map-first first-run flow)
- **Current status:** Not started
- **Effort:** S
- **Risk:** Med
- **Depends on:** phase-01
- Collapse the 6-step onboarding wizard to two steps — allergen pick (top half of `StepTemplates`) then the disclaimer/acknowledge (`StepDisclaimer`). The dropped inputs (severity, cross-contact, city, language) move to sensible defaults or later profile editing, without changing the shape of `LocalUserProfile` the recommendation engine consumes.

## Key Insights
- **`TOTAL = 6`** is a module const in `onboarding-wizard.tsx:15`; the `steps` array (lines 46–53) lists all six step components in order and drives the progress dots (lines 73–77) and the "step of" label (line 71). The finish/continue button swaps at `draft.step < TOTAL - 1` (line 83). Reducing to 2 is mostly deleting array entries and flipping the const.
- **`StepTemplates`** (`onboarding-steps.tsx:22–59`) already renders BOTH the allergen search+chips AND a dietary-profile chip group. v2 step 1 is allergen-focused; the profile chips can stay (they populate `selectedProfileIds`, which the engine still reads) — verify against the mockup rather than delete.
- **`StepDisclaimer`** (`onboarding-steps.tsx:150–178`) is the acknowledge gate — it sets `accepted`, which the finish button already requires (`disabled={!draft.accepted…}` line 94). It writes nothing itself; `safetyAcceptedAt` is stamped in `buildProfile` (line 25). Promote it to step 2 (index 1).
- **`build-profile.ts` already supplies the exact defaults the engine expects:** `severity[allergenId] ?? 'moderate'` (line 20) and `crossContact[allergenId] ?? 'not_sure'` (line 21). With the severity/cross-contact steps removed, `draft.severity`/`draft.crossContact` stay `{}` and every allergy falls back to `moderate`/`not_sure` — no engine change needed. **This is the safety property to preserve: conservative defaults, not permissive ones.**
- **City default:** `INITIAL.destinationCity = 'hanoi'` already in `use-onboarding-draft.ts:35`. `StepCity` only offered `config.supportedCities`; dropping it keeps `'hanoi'`. Acceptable for v2 (Hà Nội-first).
- **Language default:** `INITIAL.language = 'en'` (`use-onboarding-draft.ts:36`). `finish()` uses `draft.language` for the redirect locale (`onboarding-wizard.tsx:43`). With `StepLanguage` gone, default from the active locale via `useLocale()` (already imported pattern in `onboarding-steps.tsx:4`) so a VI user lands on `/vi/...`. The `useLang()` helper (lines 18–20) shows the locale→LanguageCode mapping to reuse.
- **`finish()` redirect** already targets `/home` (`onboarding-wizard.tsx:43`) via `@/i18n/navigation` router — aligned with map-first `/home`. `/login` gating is a separate greenfield phase; do not add it here.
- **Severity/cross-contact relocation:** there is **no profile-edit component today** — only read-only `profile-view.tsx` with a "restart onboarding" link (line 90). Per migration-delta §4 #8, moving these into a profile-edit surface is a **separate phase** (profile merge). This phase only removes them from onboarding and relies on `moderate`/`not_sure` defaults; leave a code comment pointing to the follow-up rather than build the editor here (YAGNI).
- **i18n:** `messages/en.json` onboarding block (lines 82–110) already has `continue`, `saveCard`, `safetyFirst`, `allergensQuestion`, etc. No new copy needed for the kept steps; unused keys (`setSeverity`, `setCrossContact`, `chooseCity`, `chooseLanguage`) can be left in place or pruned — do not invent new strings.

## Requirements
### Functional
- Onboarding presents exactly 2 steps: (1) allergen selection, (2) disclaimer acknowledge.
- Progress indicator and "step of" label read `1 of 2` / `2 of 2`.
- Finish is gated on `accepted` (unchanged) and writes a valid `LocalUserProfile` + allergy card, then redirects to `/home` in the correct locale.
- Allergies persisted with `severity: 'moderate'` and `crossContactSensitive: 'not_sure'` defaults.
- Default `destinationCity: 'hanoi'`; default `language` derived from active locale.

### Non-functional
- No hardcoded UI strings — all copy via `useTranslations('onboarding')`.
- Use `@/i18n/navigation` router/Link only (no `next/link`).
- Semantic `sb-*` tokens only (already the case).
- Each touched file stays < 200 lines; RSC boundaries unchanged (wizard stays `'use client'`).
- Human-in-the-loop preserved: defaults are conservative, never auto-verified/permissive.

## Architecture
- **Draft flow:** `useOnboardingDraft` (Zustand) is unchanged in shape — severity/crossContact/city/language setters remain but are only exercised by defaults + locale init now. `build-profile.ts` maps draft → `LocalUserProfile` with the same fallback logic.
- **Step rendering:** `onboarding-wizard.tsx` `steps` array shrinks to `[<StepTemplates/>, <StepDisclaimer/>]`; `TOTAL = 2`. Progress dots/label derive from `TOTAL`.
- **Locale-derived language:** on mount, if `draft.language` is untouched, seed it from `useLocale()` so `finish()`'s `router.replace('/home', { locale: draft.language })` lands correctly.
- **Downstream unchanged:** allergy-card build (`buildAllergyCard`), profile store hydrate, `/home` map surface.

## Related Code Files
### Modify
- `apps/web/src/features/onboarding/onboarding-wizard.tsx` — `TOTAL=2`; trim `steps` array to templates+disclaimer; seed `language` from locale; keep `finish()` → `/home`.
- `apps/web/src/features/onboarding/onboarding-steps.tsx` — remove now-dead `StepSeverity`, `StepCrossContact`, `StepCity`, `StepLanguage` exports (or keep temporarily if referenced elsewhere — grep first).
- `apps/web/src/features/onboarding/build-profile.ts` — verify defaults; add a comment noting severity/cross-contact move to profile-edit (follow-up phase).
- `apps/web/messages/en.json` + `messages/vi.json` — optionally prune unused keys (`setSeverity`, `setCrossContact`, `chooseCity`, `chooseLanguage`, `anaphylaxisNote`, `yes/no/notSure`); add product-approved VI/EN keys only if the mockup step 1/2 introduces new copy.
### Create
- None (no profile-edit built here — deferred to profile-merge phase).
### Delete
- None outright — dead step components removed in-place within `onboarding-steps.tsx`.

## Implementation Steps
1. Grep for usages of `StepSeverity`, `StepCrossContact`, `StepCity`, `StepLanguage` across the app to confirm they are only referenced by the wizard.
2. In `onboarding-wizard.tsx`: set `TOTAL = 2`; reduce the `steps` array to `[<StepTemplates …/>, <StepDisclaimer/>]`; drop the now-unused imports (`StepCity`, `StepCrossContact`, `StepLanguage`, `StepSeverity`) and the `config`/`useClientConfigQuery` usage if only `StepCity` consumed `supportedCities` (verify).
3. Add a `useLocale()`-driven effect (or lazy init) so `draft.language` defaults to the active locale when the user hasn't chosen; reuse the `useLang()` mapping (`vi` → `vi`, else `en`).
4. In `onboarding-steps.tsx`: delete the four dropped step components and their now-unused imports (`SeverityRadio`, `SEVERITIES`, `CROSS_OPTIONS`, `routing`) — keep only what `StepTemplates` and `StepDisclaimer` use.
5. In `build-profile.ts`: confirm the `?? 'moderate'` / `?? 'not_sure'` fallbacks remain; add a one-line comment: severity + cross-contact now captured in profile-edit (follow-up), defaults conservative until then.
6. Prune or leave orphan i18n keys; if the v2 mockup step 1/2 shows new microcopy, add matching keys to `en.json` and `vi.json` (product-approved VI/EN) — do not invent copy.
7. Update the e2e happy-path expectation in `apps/web/src/tests/e2e/happy-path.spec.ts` (it advances via "Continue" through the wizard and asserts `/home`) to the 2-step flow.
8. Run typecheck + lint + the onboarding/e2e tests; fix fallout.

## Todo
- [ ] Grep confirm dropped-step components are wizard-only
- [ ] `TOTAL=2` + trim `steps` array + prune imports in `onboarding-wizard.tsx`
- [ ] Seed `draft.language` from `useLocale()`
- [ ] Remove dead step components + unused imports in `onboarding-steps.tsx`
- [ ] Verify/annotate defaults in `build-profile.ts`
- [ ] Reconcile i18n keys (prune orphans / add approved new copy)
- [ ] Update `happy-path.spec.ts` for 2-step flow
- [ ] Typecheck, lint, tests green

## Success Criteria
- Wizard renders 2 steps; progress shows `1 of 2` and `2 of 2`.
- Finishing with allergens selected produces a `LocalUserProfile` whose allergies all carry `severity:'moderate'`, `crossContactSensitive:'not_sure'`, `destinationCity:'hanoi'`, and `language` matching the visited locale.
- Redirect lands on `/{locale}/home`.
- `pnpm typecheck` / `pnpm lint` clean; onboarding unit + `happy-path` e2e pass.
- No `next/link`, no hardcoded UI strings, no raw color literals introduced.

## Risk Assessment
- **Engine regression from missing severity/cross-contact:** mitigated — `build-profile.ts` already defaults to `moderate`/`not_sure`; add a unit assertion on the built profile.
- **Locale/language mismatch on redirect:** seeding from `useLocale()` prevents a VI user being sent to `/en/home`; cover in e2e.
- **Orphaned i18n keys / dead exports:** grep before delete; prune to avoid lint "unused" and confusion.
- **Data-quality drift:** defaulting everyone to `moderate` slightly widens "ask" outcomes vs. true severity — acceptable and conservative until profile-edit ships (delta §4 #8).

## Security Considerations
- **Auth:** none added; `/login` gating is a separate greenfield phase — do not couple here.
- **Zod:** no API boundary touched; the profile stays client/Dexie-only. If any onboarding value later posts to an API, validate there.
- **PII / on-device:** allergen selections remain on-device (Dexie via `profileRepo`), never auto-verified or uploaded — human-in-the-loop intact.
- **Provenance:** defaults are conservative (`not_sure`, `moderate`); nothing is marked verified by omission.

## Next Steps
- Unblocks the map-first first-run: onboarding → `/home`.
- Hands off severity + cross-contact capture to the **profile-merge / profile-edit** phase (delta §1 "Profile + bilingual card", §4 #8), where the dropped inputs become editable.
- Pairs with the `/login` gating phase, which will decide whether first-run enters onboarding directly or via login.
