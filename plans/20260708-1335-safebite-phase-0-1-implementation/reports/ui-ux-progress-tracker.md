# UI/UX Design — Progress Tracker

Living checklist for the **design layer** of phases 09–13. Complements (does not replace) the phase status
table in `../plan.md`. Spec: `ui-ux-design-integration-guide.md` ·
Reference: `docs/design/safebite-ui-ux-mockups.html` · Tokens: `apps/web/src/app/tokens.safebite.css`.

**Legend:** ☐ not started · ◐ in progress · ✅ done · ⏸ blocked/awaiting decision.
Two columns per item: **Design-ready** (tokens/icon/spec settled) and **In-code** (built in the owning phase's file).

## A. Adoption tasks (ADRs APPROVED 2026-07-08 — infra applied)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| A1 | ADR-UI-01 — `sb-*` token system (verified status trio + surfaces/brand/elevation/radius/type) via preset | `globals.css` `@import` + `tailwind.config.ts` `presets:[safebite]` | ✅ wired |
| A2 | ADR-UI-02 — `lucide-react` dependency added | `package.json` | ✅ added |
| A2b | Shell + screen re-skin to mock fidelity (`sb-*` + lucide) — hero/appbar/nav/legend/states | `app-shell/*`, landing/home, onboarding, dishes, question-card, allergy-card, profile | ✅ done (2026-07-09) |
| A3 | ADR-UI-03 — `SkeletonCard` / `StateView` / `Toast` created | `components/common/` | ✅ created |
| A4 | Brand/elevation/radius/type scales available | preset | ✅ wired |
| A5 | Repo-wide token namespace decided → **`sb-*`** | — | ✅ resolved |

## B. Shared component kit

| Component | Owner phase | Design-ready | In-code | Mockup ref |
|-----------|-------------|:---:|:---:|-----------|
| StatusBadge | 10 | ✅ | ✅ | Foundations · Status ladder |
| ConfidenceMeter (hue-neutral) | 10 | ✅ | ✅ | Foundations · Confidence |
| SourceBadge / meta chips (+AllergenBadge) | 10 | ✅ | ✅ | dish cards |
| RecommendationCard (+ Suitable caveat, bilingual subtitle, allergen + stale chips) | 10 | ✅ | ✅ | Main flow · dish cards |
| DishCard | 10 | ✅ | ✅ | Dish guide |
| LanguageToggle (≥48px) | 10 | ✅ | ✅ | Dish guide toggle |
| SafetyNotice | 09 | ✅ | ✅ | onboarding · allergy card |
| AllergyCardDisplay (brand card + AllergenChip) | 09 | ✅ | ✅ | Allergy card |
| AllergenChip (NEW — severity affordance) | 09 | ✅ | ✅ | Allergy card · Profile |
| QuestionCardDisplay (.qcard/.qs, eyebrows) | 11 | ✅ | ✅ | Question card |
| StatusLadderLegend (NEW — landing) | 10 | ✅ | ✅ | Landing · Foundations |
| OfflineBanner (bordered ask-first) | 07 | ✅ | ✅ | Offline mode |
| BottomNav (lucide + blur/elevation) | 07 | ✅ | ✅ | any phone nav |
| AppHeader (brandmark + blur) | 07 | ✅ | ✅ | app bars |
| InstallEducationCard (48px actions) | 07 | ✅ | ✅ | Profile & install |
| AdminDataTable | 12 | ✅ | ✅ | Admin dashboard |
| SkeletonCard (shimmer sweep) | 09/10 (A3) | ✅ | ✅ | States & inputs |
| StateView (empty/error, toned illustration) | 09/10 (A3) | ✅ | ✅ | States & inputs |
| Toast (success) | 11 (A3) | ✅ | ✅ | States & inputs |

## C. Screens (design applied to the phase's built screen)

| Screen | Route | Owner phase | Design applied | Mockup section |
|--------|-------|:-----------:|:---:|----------------|
| Landing (hero + legend + CTAs) | `/` | 0/1 | ✅ | Landing |
| Onboarding wizard (progress + search + radios + bottom CTA) | `/onboarding` | 09 | ✅ | Landing → Onboarding |
| Allergy card (brand card + AllergenChip) | `/allergy-card` | 09 | ✅ | Trust · Allergy card |
| Profile (identity card + chips + danger split) | `/profile` | 09 | ✅ | Profile & install |
| Home (greeting hero + icon CTAs) | `/home` | 07/09 | ✅ | Home |
| Offline (re-skin) | `/offline` | 07 | ✅ | Offline mode |
| Dish guide (appbar + filter chips + reminder) | `/dishes` | 10 | ✅ | Main flow · Dish guide |
| Dish detail (appbar + verdict + ingredient chips) | `/dishes/[id]` | 10 | ✅ | Dish detail |
| Question card (header toggle + eyebrows + bottom CTA) | `/question-card` | 11 | ✅ | Question card |
| Admin login/dashboard/tables | `/admin/*` | 12 | ✅ | Admin dashboard |

## D. Global quality gates (per screen, before marking done)
- [x] Semantic tokens only (no raw hex) · `pnpm copy:check` green · only the 5 status labels · Suitable caveat present
- [x] Status = icon + label + colour; allergen chips carry text
- [x] ≥48px targets · visible focus ring · 16px inputs · tabular timestamps
- [x] Light + dark verified · `prefers-reduced-motion` respected
- [x] Primary CTA bottom-anchored (thumb zone); destructive separated
- [x] Links via `@/i18n/navigation` (public app) — admin island excepted per phase-12 ADR

## E. Out of Phase 0/1 (mocked, reference only)
Location-permission primer · Menu scan/OCR (chooser→processing→result) · Post-meal feedback · Severe-reaction
handling · Public restaurant list/detail/map. Design is ready in the showcase; scheduled with the Phase-02
restaurant MVP (`plans/20260708-2233-safebite-phase-02-restaurant-mvp/`) and Phase 3–4.

---
_Fidelity pass 2026-07-09: consumer screens + shell + shared kit elevated from snippet-fidelity to the
`docs/design/safebite-ui-ux-mockups.html` showcase. Fixed a live i18n bug — `statuses.askFirst` (camelCase)
never matched the snake_case `t('ask_first')` every consumer passes, so the "Ask First" label rendered as the
raw key app-wide; keys realigned to `statuses.ask_first`. Verified: tsc + eslint + 46 unit tests + copy:check
green; all 8 consumer routes render 200 with no runtime errors. Admin screens remain owned by the Phase-02 agent._
