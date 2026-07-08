# UI/UX Design — Progress Tracker

Living checklist for the **design layer** of phases 09–13. Complements (does not replace) the phase status
table in `../plan.md`. Update the boxes as you build. Spec: `ui-ux-design-integration-guide.md` ·
Reference: `../visuals/safebite-ui-ux-mockups.html` · Tokens: `apps/web/src/app/tokens.safebite.css`.

**Legend:** ☐ not started · ◐ in progress · ✅ done · ⏸ blocked/awaiting decision.
Two columns per item: **Design-ready** (tokens/icon/spec settled) and **In-code** (built in the owning phase's file).

## A. Adoption tasks (ADRs APPROVED 2026-07-08 — infra applied)

| # | Task | File(s) | Status |
|---|------|---------|--------|
| A1 | ADR-UI-01 — `sb-*` token system (verified status trio + surfaces/brand/elevation/radius/type) via preset | `globals.css` `@import` + `tailwind.config.ts` `presets:[safebite]` | ✅ wired |
| A2 | ADR-UI-02 — `lucide-react` dependency added | `package.json` | ✅ added (run `pnpm install`) |
| A2b | Replace emoji nav icons with lucide (shell re-skin) | `bottom-nav.tsx` (owner 07/09) | ☐ do when shell touched |
| A3 | ADR-UI-03 — `SkeletonCard` / `StateView` / `Toast` created | `components/common/` | ✅ created |
| A4 | Brand/elevation/radius/type scales available | preset | ✅ wired |
| A5 | Repo-wide token namespace decided → **`sb-*`** | — | ✅ resolved |

## B. Shared component kit

| Component | Owner phase | Design-ready | In-code | Mockup ref |
|-----------|-------------|:---:|:---:|-----------|
| StatusBadge | 10 | ✅ (snippet) | ☐ | Foundations · Status ladder |
| ConfidenceMeter (hue-neutral) | 10 | ✅ (snippet) | ☐ | Foundations · Confidence |
| SourceBadge / meta chips | 10 | ✅ (spec) | ☐ | dish cards |
| RecommendationCard (+ Suitable caveat) | 10 | ✅ (snippet) | ☐ | Main flow · dish cards |
| DishCard | 10 | ✅ (spec) | ☐ | Dish guide |
| LanguageToggle | 10 | ✅ (spec) | ☐ | Dish guide toggle |
| SafetyNotice | 09 | ✅ (spec) | ☐ | onboarding · allergy card |
| AllergyCardDisplay | 09 | ✅ (spec) | ☐ | Allergy card |
| QuestionCardDisplay | 11 | ✅ (spec) | ☐ | Question card |
| OfflineBanner (re-skin) | 07 | ✅ (spec) | ☐ | Offline mode |
| BottomNav (emoji→Lucide) | 07 | ✅ (spec) | ☐ | any phone nav |
| AppHeader (re-skin) | 07 | ✅ (spec) | ☐ | app bars |
| InstallEducationCard (re-skin) | 07 | ✅ (spec) | ☐ | Profile & install |
| AdminDataTable | 12 | ✅ (spec) | ☐ | Admin dashboard |
| SkeletonCard | 09/10 (A3) | ✅ (snippet) | ☐ | States & inputs |
| StateView (empty/error) | 09/10 (A3) | ✅ (snippet) | ☐ | States & inputs |
| Toast (success) | 11 (A3) | ✅ (spec) | ☐ | States & inputs |

## C. Screens (design applied to the phase's built screen)

| Screen | Route | Owner phase | Design applied | Mockup section |
|--------|-------|:-----------:|:---:|----------------|
| Onboarding wizard | `/onboarding` | 09 | ☐ | Landing → Onboarding |
| Allergy card | `/allergy-card` | 09 | ☐ | Trust · Allergy card |
| Profile | `/profile` | 09 | ☐ | Profile & install |
| Home (re-skin) | `/home` | 07/09 | ☐ | Home |
| Offline (re-skin) | `/offline` | 07 | ☐ | Offline mode |
| Dish guide | `/dishes` | 10 | ☐ | Main flow · Dish guide |
| Dish detail | `/dishes/[id]` | 10 | ☐ | Dish detail |
| Question card | `/question-card` | 11 | ☐ | Question card |
| Admin login/dashboard/tables | `/admin/*` | 12 | ☐ | Admin dashboard |

## D. Global quality gates (per screen, before marking done)
- [ ] Semantic tokens only (no raw hex) · `pnpm copy:check` green · only the 5 status labels · Suitable caveat present
- [ ] Status = icon + label + colour; allergen chips carry text
- [ ] ≥48px targets · visible focus ring · 16px inputs · tabular timestamps
- [ ] Light + dark verified · `prefers-reduced-motion` respected
- [ ] Primary CTA bottom-anchored (thumb zone); destructive separated
- [ ] Links via `@/i18n/navigation` (public app) — admin island excepted per phase-12 ADR

## E. Out of Phase 0/1 (mocked, reference only)
Location-permission primer · Menu scan/OCR (chooser→processing→result) · Post-meal feedback · Severe-reaction
handling · Admin severe-report queue · Admin OCR review. Design is ready in the showcase; schedule with
Phase 2–4/5.

---
_Last updated: 2026-07-08 (design layer authored). The impl agents own columns "In-code" / "Design applied"._
