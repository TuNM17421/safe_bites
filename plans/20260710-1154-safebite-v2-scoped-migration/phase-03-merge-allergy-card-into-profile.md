# Phase 03 — Merge allergy-card into Profile (bilingual + VI/EN toggle)

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta: [../migration-delta.md](../migration-delta.md) (§1 "Profile + bilingual card" row; §3 removal of `/allergy-card`)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — Hồ sơ (Profile) screen
- Current code:
  - `apps/web/src/features/profile/profile-view.tsx`
  - `apps/web/src/features/allergy-card/allergy-card-display.tsx`
  - `apps/web/src/components/common/language-toggle.tsx`
  - `apps/web/src/components/safety/safety-notice.tsx`
  - `apps/web/src/app/[locale]/(app)/profile/page.tsx`
  - `apps/web/src/app/[locale]/(app)/allergy-card/page.tsx`

## Overview
- **Priority:** High (unblocks bottom-nav Hồ sơ tab + removes a demoted destination)
- **Current status:** Not started
- **Effort:** M
- **Risk:** low
- **Depends on:** phase-02 (5-tab bottom nav / route disposition)

Fold the standalone bilingual allergy card into `/profile` so a single screen shows the identity card, a VI+EN staff card (always showing both languages for restaurant staff), the calm `SafetyNotice`, a VI/EN segment toggle, and a targeted "edit my allergies" deep-link to onboarding. Then delete the `/allergy-card` route (302 → `/profile`) and purge its inbound shortcuts. Human-in-the-loop is unaffected: this phase only relocates read/display of already-saved profile data.

## Key Insights
- **`AllergyCardDisplay`** (`allergy-card-display.tsx`) already renders the reusable bilingual block: a `bg-sb-brand-soft` section, a `divide-y` list where each entry is `<AllergenChip name={e.name.en} …/>` plus `<span>{e.name.vi}</span>`, severity via `tSev`, and cross-contact via a `crossLabel` helper reading `t('crossContactAvoid'|'crossContactOk')` / `tCross('notSure')`. It ends with `<SafetyNotice/>` and an `offlineMeta` date line formatted with `Intl.DateTimeFormat(locale, …)`. This is the block to lift into profile.
- **`ProfileView`** (`profile-view.tsx`) is a `'use client'` component reading `useProfileStore` (`hydrated`, `profile`, `allergyCard` as `card`, `clearAll`) and already uses `useLocale()`, `@/i18n/navigation` `Link`/`useRouter`. It renders identity chips (allergens/dietary split by `isConstraintOnly`), destination + language `MetaChip`s, a `restartOnboarding` link to `/onboarding`, and a separated destructive `clearData` button. It currently shows only single-locale chip names (`e.name[locale]`), not the bilingual staff card.
- **`LanguageToggle`** (`language-toggle.tsx`) is a controlled segmented control `{ value, onChange }` over `LanguageCode` `'en'|'vi'`; it flips **data** language only, not the URL locale. Reuse pattern is established in `restaurant-guide.tsx:75` (`const [dataLang,setDataLang]=useState(...)` → `<LanguageToggle value={dataLang} onChange={setDataLang}/>`). The v2 card must keep showing BOTH languages for staff; the toggle governs which language is primary/emphasised, not which is hidden.
- **`SafetyNotice`** is self-contained (`t('safety.disclaimer')`), reusable as-is.
- **Inbound references to remove/redirect** (from grep): `app-header.tsx:16` (IdCard `href="/allergy-card"`), `restaurant-guide.tsx:109`, `dishes/dish-guide.tsx:81`, `home/page.tsx:86`, `offline/page.tsx:16`, and `profile-hydrator.tsx:6` `PROFILE_REQUIRED = ['/dishes','/allergy-card','/question-card']`. E2E `tests/e2e/happy-path.spec.ts:53` navigates `/en/allergy-card` and must be updated.
- **i18n today:** `messages/en.json` has `allergyCard.*` (offlineMeta, severity, crossContact, crossContactAvoid/Ok, showToStaff, noCard, startProfile…) and `profile.*` (you, allergies, constraints, restartOnboarding, clearData, noProfile, startProfile). Reusable `allergyCard.*` keys must be relocated/duplicated under `profile.*` and mirrored in `vi.json`.
- **Gotcha:** `profile-view.tsx` will approach the <200-line rule once the card block is folded in. Extract the bilingual card into a small child component (e.g. `profile-allergy-card.tsx`) rather than inlining everything.

## Requirements
**Functional**
- `/profile` shows: identity card (existing) → bilingual VI+EN staff allergy card → `SafetyNotice` → offline "last updated" line.
- A VI/EN segment toggle (`LanguageToggle`) sits in the profile/card header and controls which language is emphasised; both VI and EN names remain visible for staff regardless of toggle.
- An "edit my allergies" action deep-links to onboarding step 1 (allergen step) — distinct from the existing full "restart onboarding" action.
- `/allergy-card` no longer exists as a destination: route removed and `302 → /profile` (locale-aware).
- All former `/allergy-card` entry points (header IdCard, restaurant/dish/home CTAs, offline link) are removed or repointed.

**Non-functional**
- No hardcoded UI strings — all copy via `useTranslations`; add product-approved VI/EN keys under `profile.*`.
- Use `@/i18n/navigation` `Link`/`router` only (no `next/link`); semantic `sb-*` tokens only.
- Each touched code file stays <200 lines; extract a child component if needed.
- No behavioural change to how data is written/verified (display-only relocation).

## Architecture
- **`ProfilePage` (RSC)** unchanged in shape: sets locale, renders `<ProfileView/>` under the `nav.profile` heading.
- **`ProfileView` (client)**: owns `const [dataLang,setDataLang] = useState<LanguageCode>(locale)`, renders identity section (existing), then `<ProfileAllergyCard entries={card.entries} dataLang={dataLang} updatedAt={card.updatedAt}/>`, then actions. Header row gains `<LanguageToggle value={dataLang} onChange={setDataLang}/>` next to the card title.
- **`ProfileAllergyCard` (new client child)**: the lifted bilingual list + `SafetyNotice` + offline meta from `allergy-card-display.tsx`, parametrised by `dataLang` to choose the emphasised name while keeping the secondary-language span. Keeps `crossLabel` + `Intl.DateTimeFormat` logic.
- **Edit-allergies deep link**: `Link href="/onboarding?step=1"` (or agreed query/hash per onboarding's step model — confirm with phase-02's `TOTAL=2` onboarding). Falls back to `/onboarding` if step deep-linking isn't wired.
- **Redirect**: `allergy-card/page.tsx` replaced by `redirect('/profile')` via `@/i18n/navigation` (locale-aware) so old links/bookmarks resolve.
- **Data flow**: unchanged — Dexie-hydrated `useProfileStore.allergyCard` is the single source; no API/schema changes.

## Related Code Files
**Modify**
- `apps/web/src/features/profile/profile-view.tsx` — add `LanguageToggle` + `dataLang` state, render child card, add edit-allergies link.
- `apps/web/src/app/[locale]/(app)/allergy-card/page.tsx` — replace body with locale-aware `redirect('/profile')` (or delete file — see Delete).
- `apps/web/src/components/app-shell/app-header.tsx` — remove IdCard `/allergy-card` shortcut.
- `apps/web/src/components/app-shell/profile-hydrator.tsx` — drop `/allergy-card` from `PROFILE_REQUIRED`.
- `apps/web/src/features/restaurants/restaurant-guide.tsx` — remove `showAllergyCard` CTA (`:109`).
- `apps/web/src/features/dishes/dish-guide.tsx` — remove `showAllergyCard` CTA (`:81`).
- `apps/web/src/app/[locale]/(app)/home/page.tsx` — remove `/allergy-card` ghost link (`:86`).
- `apps/web/src/app/[locale]/offline/page.tsx` — repoint `/allergy-card` link to `/profile` (`:16`).
- `apps/web/messages/en.json` + `apps/web/messages/vi.json` — add `profile.*` keys (relocate reusable `allergyCard.*`).
- `apps/web/src/tests/e2e/happy-path.spec.ts` — replace `/en/allergy-card` nav with `/en/profile` assertions (`:53`).

**Create**
- `apps/web/src/features/profile/profile-allergy-card.tsx` — extracted bilingual staff-card child (<200 lines; keeps files small).

**Delete**
- `apps/web/src/features/allergy-card/allergy-card-display.tsx` — once its block is fully absorbed (verify no other importers; onboarding imports `build-allergy-card`, not the display — keep the builder).
- Optionally the `allergy-card` route dir if a top-level redirect is configured instead of a page-level `redirect`.

## Implementation Steps
1. Create `profile-allergy-card.tsx` by lifting the bilingual list + `crossLabel` + `SafetyNotice` + `offlineMeta` block from `allergy-card-display.tsx`; accept `{ entries, dataLang, updatedAt }`; emphasise `dataLang` name and show the other language as the secondary span. Point its `useTranslations` at `profile`.
2. In `profile-view.tsx`, import `LanguageToggle` + `useState`, add `const [dataLang,setDataLang]=useState<LanguageCode>(locale)`, place the toggle in the card header, and render `<ProfileAllergyCard .../>` between identity and actions (guard on `card`/`entries.length`).
3. Add the "edit my allergies" `Link` to onboarding step 1, alongside the existing `restartOnboarding` link (distinct label/icon, e.g. `Pencil` vs a list icon).
4. Relocate reusable `allergyCard.*` copy into `profile.*` in `en.json` and mirror in `vi.json`; add product-approved VI/EN keys for the new edit-allergies action and any card labels. Remove now-orphaned `allergyCard.*` keys once no consumer remains.
5. Replace `allergy-card/page.tsx` with a locale-aware `redirect('/profile')` (or remove route + add redirect); delete `allergy-card-display.tsx`.
6. Purge inbound shortcuts: `app-header.tsx`, `restaurant-guide.tsx`, `dish-guide.tsx`, `home/page.tsx`; repoint `offline/page.tsx` to `/profile`; remove `/allergy-card` from `PROFILE_REQUIRED` in `profile-hydrator.tsx`.
7. Update `happy-path.spec.ts` to exercise the card via `/profile` instead of `/allergy-card`.
8. Run typecheck + lint + affected tests; verify no dangling imports of the deleted display component or removed i18n keys.

## Todo
- [ ] Create `profile-allergy-card.tsx` (bilingual list + SafetyNotice + offline meta, `dataLang`-driven)
- [ ] Wire `LanguageToggle` + `dataLang` state into `profile-view.tsx`
- [ ] Add "edit my allergies" deep-link to onboarding step 1
- [ ] Relocate/add `profile.*` VI/EN i18n keys; drop orphaned `allergyCard.*`
- [ ] Replace `/allergy-card` page with `302 → /profile`; delete `allergy-card-display.tsx`
- [ ] Remove/repoint all inbound `/allergy-card` links + `PROFILE_REQUIRED` entry
- [ ] Update `happy-path.spec.ts`
- [ ] Typecheck + lint + tests green

## Success Criteria
- `/profile` renders identity card + bilingual VI+EN staff card + `SafetyNotice` + offline "last updated" line, matching the v2 mockup Hồ sơ screen.
- VI/EN toggle changes the emphasised language while both languages stay visible; toggle does not change URL locale.
- "Edit my allergies" navigates to onboarding step 1; "restart onboarding" still resets fully.
- Visiting `/en/allergy-card` or `/vi/allergy-card` 302-redirects to the locale's `/profile`; no inbound `/allergy-card` links remain (grep clean).
- No hardcoded strings; all copy resolves in both `en.json` and `vi.json` (no missing-key warnings).
- All touched files <200 lines; `pnpm typecheck` + lint + updated E2E/unit tests pass.

## Risk Assessment
- **Orphaned i18n keys / missing-key runtime warnings** → after moving keys, grep for every removed `allergyCard.*` usage; keep a key only if still consumed.
- **Deleting `allergy-card-display.tsx` breaks an importer** → grep confirms only the `allergy-card` page imports the display; onboarding imports the separate `build-allergy-card` builder (keep it).
- **Onboarding step deep-link contract** → step-1 query/hash depends on phase-02's 2-step onboarding; if not yet wired, fall back to `/onboarding` and note follow-up.
- **File-size creep in `profile-view.tsx`** → mitigated by the `profile-allergy-card.tsx` extraction.

## Security Considerations
- **PII / on-device:** allergy data stays client-side in Dexie via `useProfileStore`; this phase adds no network calls and no new persistence — display relocation only.
- **No new API boundary:** no Zod schema needed here; if the edit-allergies link ever posts data, that stays within onboarding's existing validated write path.
- **Provenance / human-in-the-loop:** unaffected — no data is created, verified, or auto-approved; the card only displays already-saved, user-entered profile entries.
- **Auth:** `/profile` and the redirect live inside the existing `(app)` group; no new access surface introduced.

## Next Steps
- Unblocks phase-02's 5-tab nav by giving Hồ sơ its consolidated destination and finalising the `/allergy-card` demotion in `migration-delta.md §3`.
- Frees the `IdCard` header slot and CTA space reused by later map/dish phases.
- Establishes the `dataLang`-driven bilingual card pattern reused by restaurant/dish detail phases.
