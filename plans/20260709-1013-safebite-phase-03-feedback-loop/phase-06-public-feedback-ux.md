# Phase 06 — Public feedback UX (form, routes, CTAs, badges, i18n)

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §5 (UX scope: routes, entry points, 6 form steps, summary display), §13 (components + a11y), §14 (i18n EN/VI), §15 (public page behavior). Supporting: §11.6 (forbidden source labels), §18 (FeedbackSummary contract).
- Reality map: `research/codebase-reality-map.md` §6 (i18n/copy guard), §8 (UI components & tokens, multi-step template, severe notice).
- Contract: `research/interface-contract.md` → "Client / UI" + "Cross-cutting safety invariants".
- Depends on: [[phase-03-public-feedback-api]] (POST `/api/v1/feedback`, GET `/api/v1/feedback/options`), [[phase-04-recommendation-integration]] (`feedbackSummary` on responses), [[phase-01-domain-feedback-core]] (`FeedbackReportInputSchema`, enum unions/schemas). Unblocks: [[phase-07-offline-queue-sync]] (fills the submit-or-queue seam).

## Overview

**Priority:** High (user-facing surface of the loop). **Current status:** Not started.

Build the public post-meal feedback experience: two locale routes (`/[locale]/(app)/feedback/new` + `/thanks`), a mobile-first multi-step `FeedbackForm` mirroring the onboarding wizard, entry CTAs on restaurant detail and the menu-item card, the `feedback-under-review` badge + summary banner + severe `role="alert"` notice, and a new `feedback` i18n namespace with exact EN/VI key parity. **Online submit only** — the submit path calls a single `submitFeedback` seam that phase 06 implements as a plain POST; [[phase-07-offline-queue-sync]] later swaps its body for Dexie queue-or-send without touching the form.

## Key Insights (grounded facts + spec deltas)

- **Multi-step template = onboarding wizard.** `features/onboarding/onboarding-wizard.tsx` drives `steps[draft.step]` with a sticky full-width primary footer button; draft is a **transient Zustand store** (`use-onboarding-draft.ts`, never persisted, never URL'd). Mirror this exactly with a new `use-feedback-draft.ts`.
- **Radio pattern is `SeverityRadio`** in `features/onboarding/onboarding-controls.tsx`: `<button role="radio" aria-checked>` inside a `<div role="radiogroup" aria-label>`. Reuse this shape for reaction, reaction-timing, staff-answer, and the 1–5 trust rating.
- **Profile shape (reality map §5):** `useProfileStore.getState().profile` → `LocalUserProfile` with `allergies: [{allergenId, severity, crossContactSensitive: boolean|'not_sure'}]` and dietary profiles as **`selectedProfileIds: string[]`** (NO `dietaryProfiles` field on the store). The API `profileSnapshot` shape is owned by [[phase-01-domain-feedback-core]]; map `selectedProfileIds` → snapshot dietary field there.
- **Status labels are snake_case internally** (`suitable|ask_first|risky|avoid|unknown`); localized via `useTranslations('statuses')`. Only the 5 public labels may appear.
- **`feedbackSummary` is additive/optional** on `MenuRecommendation` and the restaurant recommendation (added by [[phase-04-recommendation-integration]]). Render defensively (`rec.feedbackSummary?`) — UI must not break when absent.
- **Severe notice uses `role="alert"`, not `role="note"`.** `SafetyNotice` (`role="note"`) is the calm disclaimer — do not reuse it for the emergency notice. Nearest colored-alert template is the offline box in `restaurant-detail.tsx:86` (`sb-status-ask-first` triad, `role="status"`); use `sb-status-avoid`/`sb-status-ask-first` triad + `role="alert"`.
- **copy:check scans `messages/*.json`** (reality map §6). New EN/VI copy must avoid the denylist substrings AND spec §11.6 phrases: never emit "User verified", "Community verified", "Reported safe", "guaranteed safe", "verified_safe". Public feedback source label = **"Feedback under review"** only.
- **CTA host anchors:** `menu-item-recommendation-card.tsx` trailing CTA `<Link>` is `:49-55` (add a sibling after it); its meta row is `:39-47` (add the under-review badge there). `restaurant-detail.tsx` readiness `<section>` is `:101-113` and `rec` is destructured `:72`.

## Requirements

**Functional**
- Routes `/[locale]/feedback/new?restaurantId=<id>&menuItemId=<id?>` and `/[locale]/feedback/thanks`. `restaurantId`/`menuItemId` may appear in URL; **allergy/profile data never in URL**.
- Form has 6 steps per spec §5.3: (1) context confirmation + optional menu-item selector, (2) ateHere + visitedAt, (3) allergen/profile concern (prefilled from local profile), (4) askedStaff + staffAnswer + staffAnswerText, (5) reaction + reactionTiming (+ severe notice), (6) userTrustRating + notes + submit.
- On load: read `restaurantId`/`menuItemId` from URL, fetch public metadata via GET `/api/v1/feedback/options`, read active profile from Zustand, build minimal `profileSnapshot` + optional `recommendationSnapshot`. If profile missing, allow manual allergen selection + post-submit "create profile" CTA.
- Submit validates against `FeedbackReportInputSchema` and calls `submitFeedback(payload)`; on success `router.replace('/feedback/thanks')`. `clientReportId` via `crypto.randomUUID()`.
- Entry CTAs: restaurant-detail "Share meal feedback" (passes `restaurantId`); menu-item card "I ate this / Share feedback" (passes `restaurantId`, `menuItemId`, `dishId?`).
- `FeedbackUnderReviewBadge` renders in the menu-item card meta row and restaurant-detail readiness section when `feedbackSummary.hasActiveFlags`. `FeedbackSummaryBanner` shows aggregate-only info (count, last report relative date, action + severe variant).

**Non-functional**
- All form/CTA/badge components are `'use client'`; route `page.tsx` files are RSC shells (`setRequestLocale(locale)`) rendering the client feature.
- No hardcoded UI strings (all via `feedback`/`statuses` namespaces); no `next/link` (use `@/i18n/navigation` `Link`/`useRouter`); no raw colors (`sb-*` tokens); files < ~200 lines, kebab-case.
- Full a11y: labelled inputs, `role="radiogroup"`/`role="radio"` for reaction+rating+staff-answer, `role="alert"` severe notice, never color-alone, `min-h-sb-tap` targets.

## Architecture

Data / control flow:

```
restaurant-detail / menu-item-card
  └─ FeedbackEntryButton (Link → /feedback/new?restaurantId&menuItemId&dishId)
        └─ feedback/new/page.tsx (RSC shell) → <FeedbackForm/> ('use client')
              ├─ useFeedbackDraft()        transient Zustand (step + answers) — never URL/persist
              ├─ useFeedbackOptions(rid)   GET /api/v1/feedback/options (TanStack Query)
              ├─ useProfileStore.getState().profile → build-feedback-snapshot.ts (minimal snapshot)
              └─ submit: FeedbackReportInputSchema.parse(payload) → submitFeedback(payload)  [SEAM]
                        └─ success → router.replace('/feedback/thanks')
feedback/thanks/page.tsx (RSC shell) → <FeedbackSuccessPanel/> (online submitted copy)

recommendation responses (phase-04) → feedbackSummary
  ├─ FeedbackUnderReviewBadge   (menu-item meta row + restaurant readiness section)
  └─ FeedbackSummaryBanner      (aggregate-only; severe variant via publicMessageKey)
```

Submit-or-queue seam: `feedback-client.ts` exports `submitFeedback(payload)` (online POST, Zod-validated response). The form imports **only** this function. Phase 07 introduces `offline-feedback-queue.ts` + `use-feedback-sync.ts` and rewires `submitFeedback` to try-online-then-queue — the form and steps stay untouched.

## Related Code Files

### Modify
- `apps/web/src/components/restaurants/menu-item-recommendation-card.tsx` — add `FeedbackEntryButton` sibling after CTA `<Link>` (`:49-55`); add `FeedbackUnderReviewBadge` into meta row (`:39-47`) gated on `rec.feedbackSummary?.hasActiveFlags`.
- `apps/web/src/features/restaurants/restaurant-detail.tsx` — add restaurant-level "Share meal feedback" `FeedbackEntryButton` in readiness `<section>` (`:101-113`); render `FeedbackSummaryBanner`/`FeedbackUnderReviewBadge` from `rec.feedbackSummary` before `<SafetyNotice/>`.
- `apps/web/messages/en.json` — add `feedback` namespace.
- `apps/web/messages/vi.json` — add `feedback` namespace (exact key parity with en.json).

### Create
- `apps/web/src/app/[locale]/(app)/feedback/new/page.tsx` — RSC shell (`setRequestLocale`, read `searchParams`), renders `<FeedbackForm/>`.
- `apps/web/src/app/[locale]/(app)/feedback/thanks/page.tsx` — RSC shell, renders `<FeedbackSuccessPanel/>`.
- `apps/web/src/features/feedback/feedback-form.tsx` — `'use client'` multi-step orchestrator (mirrors `onboarding-wizard.tsx`).
- `apps/web/src/features/feedback/use-feedback-draft.ts` — transient Zustand draft (step + all answers).
- `apps/web/src/features/feedback/feedback-steps.tsx` — the 6 step section components (split further if > ~200 lines).
- `apps/web/src/features/feedback/feedback-controls.tsx` — `ReactionRadio`/`RatingRadio`/select primitives (reuse `SeverityRadio` shape).
- `apps/web/src/features/feedback/build-feedback-snapshot.ts` — minimal `profileSnapshot` + `recommendationSnapshot` builders (no geo).
- `apps/web/src/features/feedback/feedback-client.ts` — `submitFeedback(payload)` fetch + Zod (the submit-or-queue seam).
- `apps/web/src/features/feedback/use-feedback-options.ts` — TanStack Query hook over GET `/api/v1/feedback/options`.
- `apps/web/src/features/feedback/feedback-entry-button.tsx` — CTA `Link` (from `@/i18n/navigation`) used by both hosts.
- `apps/web/src/components/feedback/feedback-under-review-badge.tsx` — muted chip (`sb-surface-2`), localized `feedback.underReview`.
- `apps/web/src/components/feedback/feedback-summary-banner.tsx` — aggregate-only banner (count/last report/action + severe variant).
- `apps/web/src/components/feedback/feedback-success-panel.tsx` — thanks-screen panel.
- `apps/web/src/components/feedback/feedback-severe-notice.tsx` — `role="alert"` non-medical emergency notice.

### Delete
- None.

## Implementation Steps

1. Add the `feedback` namespace to `en.json`: entry CTAs, step titles/labels, reaction/timing/staff-answer option labels, trust rating, notes limit hint, submit, severe notice, success copy, `underReview`, `summaryBanner` (count/lastReport/action + severe variant), and privacy hints. Use spec §5/§14 wording; keep it calm and hedged. Then add the identical key tree to `vi.json` with translations (ICU plurals drop the `one` branch). Run `pnpm copy:check` to confirm no denylist/§11.6 hits.
2. Create `use-feedback-draft.ts` — a transient Zustand store mirroring `use-onboarding-draft.ts`: `step`, `menuItemId`, `dishId`, `ateHere`, `visitedAt`, `allergenIds`, `profileConcernType`, `severitySnapshot`, `crossContactSensitiveSnapshot`, `askedStaff`, `staffAnswer`, `staffAnswerText`, `reaction`, `reactionTiming`, `userTrustRating`, `notes` + setters + `reset()`. Never persisted, never serialized to URL.
3. Create `feedback-controls.tsx` — reaction/timing/staff-answer/rating radios reusing the `SeverityRadio` `role="radio"`/`aria-checked` shape; wrap groups in `role="radiogroup" aria-label`.
4. Create `build-feedback-snapshot.ts` — `buildProfileSnapshot(profile, selectedAllergenIds)` returns the minimal snapshot (allergies subset by chosen allergenIds + dietary from `selectedProfileIds`); `buildRecommendationSnapshot(rec?)` captures status/readiness/confidence/source/lastCheckedAt from route state. **Assert no lat/lon/distance keys leak in.**
5. Create `feedback-client.ts` — `submitFeedback(payload: FeedbackReportInput): Promise<FeedbackReportResponse>`: POST `/api/v1/feedback`, parse the envelope, validate with `FeedbackReportResponseSchema`. Treat 409-as-success (duplicate returns existing). This is the phase-07 seam — keep it the single submit entry point.
6. Create `use-feedback-options.ts` — TanStack Query hook GET `/api/v1/feedback/options?restaurantId=`, returning restaurant name + menu items + allergens for step 1/3.
7. Create `feedback-steps.tsx` — the 6 step sections per §5.3, prefilling step 3 from the local profile; step 5 conditionally renders `<FeedbackSevereNotice/>` when reaction ∈ {`severe`,`anaphylaxis_or_emergency`}; step 4 shows `staffAnswer` only when `askedStaff==='yes'`. Length-limit `staffAnswerText`/`notes` to 500 in the inputs.
8. Create `feedback-form.tsx` — orchestrator mirroring `onboarding-wizard.tsx`: progress dots, back button, `steps[draft.step]`, sticky footer (Continue → Submit). On submit: build payload, `FeedbackReportInputSchema.parse`, call `submitFeedback`, on success `draft.reset()` + `router.replace('/feedback/thanks')`; show inline validation errors (never queue them).
9. Create `feedback/new/page.tsx` + `feedback/thanks/page.tsx` RSC shells (`setRequestLocale`, await `params`/`searchParams`).
10. Create `feedback-entry-button.tsx` and wire it into `menu-item-recommendation-card.tsx` (sibling after CTA, meta-row badge) and `restaurant-detail.tsx` (readiness section).
11. Create `feedback-under-review-badge.tsx`, `feedback-summary-banner.tsx`, `feedback-success-panel.tsx`, `feedback-severe-notice.tsx`; wire the summary banner + badge into `restaurant-detail.tsx` from `rec.feedbackSummary`.
12. Run `pnpm --filter web typecheck && pnpm --filter web lint && pnpm copy:check`; fix issues.

## Todo List

- [ ] `feedback` namespace added to en.json + vi.json (exact key parity, copy:check green)
- [ ] `use-feedback-draft.ts` transient store (no persist/URL)
- [ ] `feedback-controls.tsx` accessible radios (radiogroup/radio)
- [ ] `build-feedback-snapshot.ts` minimal snapshot, no geo
- [ ] `feedback-client.ts` `submitFeedback` seam (online POST + Zod, 409-as-success)
- [ ] `use-feedback-options.ts` options hook
- [ ] `feedback-steps.tsx` 6 steps incl. severe notice + staff-answer gating + 500-char limits
- [ ] `feedback-form.tsx` orchestrator (validate → submit → redirect thanks)
- [ ] `feedback/new/page.tsx` + `feedback/thanks/page.tsx` RSC shells
- [ ] `feedback-entry-button.tsx` + CTAs on menu-item card & restaurant detail
- [ ] under-review badge, summary banner, success panel, severe notice components wired
- [ ] typecheck + lint + copy:check green

## Success Criteria

- From restaurant detail and a menu-item card a user reaches `/feedback/new` with `restaurantId`(+`menuItemId`/`dishId`) in the URL and **no profile data in the URL**.
- The 6-step form submits online without an account; a valid submission redirects to `/feedback/thanks` showing "submitted for review" copy.
- Selecting a severe/anaphylaxis reaction renders a `role="alert"` non-medical emergency notice.
- When `rec.feedbackSummary.hasActiveFlags`, the under-review badge + summary banner appear (aggregate-only — no raw notes/staffAnswerText/exact timestamps).
- `pnpm --filter web typecheck`, `pnpm --filter web lint`, and `pnpm copy:check` pass; EN/VI `feedback` keys are at exact parity.
- Manual: severe path shows the alert; absent-`feedbackSummary` recommendations render unchanged.

## Risk Assessment

- **Profile leaking into URL** → build snapshot client-side only; `FeedbackEntryButton` href carries just `restaurantId`/`menuItemId`/`dishId`. Assert no profile keys in query construction.
- **Geo leaking into feedback record** → `build-feedback-snapshot.ts` constructs an explicit allow-list of fields; the `assertNoSecrets` guard does NOT catch geo keys, so keep the snapshot shape closed.
- **copy:check failure on new strings** → draft copy hedged; run `copy:check` before wiring; optionally strengthen denylist per contract (never weaken).
- **Coupling form to offline logic prematurely** → form imports only `submitFeedback`; all queue behavior stays behind that seam for [[phase-07-offline-queue-sync]].
- **`feedbackSummary` not yet available (phase-04 lands after)** → all reads are optional-chained; badge/banner simply don't render when absent.
- **Files exceeding ~200 lines** → split steps into `feedback-steps.tsx` + `feedback-controls.tsx`; extract snapshot/client/options into their own modules.

## Security & Privacy Considerations

- Allergy/profile data never in URL, analytics, or logs — only `restaurantId`/`menuItemId`/`dishId` in the query string.
- `profileSnapshot` is minimal (chosen allergen subset + severity + cross-contact + dietary ids); no full store dump, no name/email/phone, no geolocation/lat/lon/distance.
- Public display components show aggregate-only fields (`hasActiveFlags`, counts, coarse last-report date, `publicMessageKey`); **never** render raw `notes`/`staffAnswerText`/exact timestamps.
- Only the five public status labels + "Feedback under review" source label; never "User/Community verified" or "Reported safe" (spec §11.6) and never any denylist phrase.
- Severe notice is non-medical: no symptom/medication/diagnosis capture, no "we will contact emergency services" / "you are safe now" claims (spec §15.4).
- `staffAnswerText`/`notes` length-limited to 500 chars in the inputs (server re-validates via [[phase-03-public-feedback-api]]).

## Next Steps

- [[phase-07-offline-queue-sync]] fills the `submitFeedback` seam with Dexie queue + `use-feedback-sync.ts` foreground sync and adds the offline-queued success state + `FeedbackOfflineQueueBanner`.
- [[phase-04-recommendation-integration]] must ship `feedbackSummary` on menu/restaurant recommendation responses for the badge/banner to activate in production.
- Phase 09 covers e2e (happy path + severe flow) and README manual-QA for these surfaces.
