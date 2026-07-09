# SafeBite — UI/UX North Star

**This folder is the single source of truth for how SafeBite looks and behaves. Every phase — current and future — builds toward the mockups here.**

> **Motion / page transitions:** screen-to-screen navigation uses React **View Transitions** (cross-fade + shared-element morph), enabled by the Next 16 upgrade — see `docs/NEXT16_MIGRATION.md` (§ "Page transitions"). Until that upgrade lands, a CSS fade (`(app)/template.tsx`) is used. Component-level motion still uses the `sb-*` motion tokens and always respects `prefers-reduced-motion`.

## Files

| File | What it is |
|------|-----------|
| [`safebite-ui-ux-mockups.html`](./safebite-ui-ux-mockups.html) | The canonical design showcase — 24 screens (light + dark), the full token system, component kit, states, and motion spec. Open it in a browser; it is self-contained. |
| [`../../apps/web/src/app/tokens.safebite.css`](../../apps/web/src/app/tokens.safebite.css) | The `--sb-*` design tokens (verified WCAG 2.2, colour-blind-safe status ladder), wired into `globals.css`. |
| [`../../apps/web/tailwind.safebite-preset.ts`](../../apps/web/tailwind.safebite-preset.ts) | Tailwind preset exposing the tokens as `sb-*` utilities (colours, elevation `shadow-sb-e1..e4`, radius `rounded-sb-md/lg/xl`, type `text-sb-h1..caption`, motion). |
| [`../../apps/web/DESIGN_TOKENS.md`](../../apps/web/DESIGN_TOKENS.md) | Token reference + usage rules. |
| [`../../plans/20260708-1335-safebite-phase-0-1-implementation/reports/ui-ux-design-integration-guide.md`](../../plans/20260708-1335-safebite-phase-0-1-implementation/reports/ui-ux-design-integration-guide.md) | Per-screen design mapping + ready-to-paste component snippets. |

## Positioning (never violate)

The product promise is **risk reduction, not risk elimination**. No screen ever claims a dish is safe, guaranteed, or allergy-proof (enforced by `pnpm --filter @safebite/web copy:check`).

## Design non-negotiables

- **Tokens only** — consume `sb-*` utilities; never raw hex/rgb. Coral (`sb-appetite-*`) is decorative/appetite **fill only**, never inside a status/allergen/confidence surface.
- **Status = icon + label + colour** (never colour alone). The ladder is exactly five: `Suitable · Ask First · Risky · Avoid · Unknown`. **Unknown never becomes Suitable.**
- Every recommendation shows **source · confidence · reason · action · last-checked**; a `suitable` card always renders the caveat.
- **Accessibility:** ≥48px touch targets, visible focus ring (`focus-visible:shadow-sb-focus`), 16px inputs (no iOS zoom), tabular timestamps, light + dark verified, `prefers-reduced-motion` honoured.
- **Layout:** primary CTA bottom-anchored / full-width (thumb zone); destructive actions kept far away.
- **i18n:** all copy via `useTranslations` (EN + VI); links via `@/i18n/navigation` (the admin island is excepted per the phase-12 ADR).

## Mock screen → route → implementing files

| Mock section | Route | Primary files | Owner phase |
|---|---|---|---|
| Landing | `/` | `app/[locale]/page.tsx` | 0/1 |
| Onboarding (allergens/severity/safety) | `/onboarding` | `features/onboarding/*` | 0/1 (P09) |
| Home ("I'm hungry") | `/home` | `app/[locale]/(app)/home/page.tsx` | 0/1 |
| Dish guide | `/dishes` | `features/dishes/{dish-guide,dish-card,dish-filter-bar,dish-group-list}.tsx` | 0/1 (P10) |
| Dish detail | `/dishes/[id]` | `features/dishes/dish-detail.tsx` | 0/1 (P10) |
| Question card | `/question-card` | `features/question-card/*`, `components/safety/question-card-display.tsx` | 0/1 (P11) |
| Allergy card | `/allergy-card` | `features/allergy-card/*` | 0/1 (P09) |
| Profile & install | `/profile` | `features/profile/profile-view.tsx`, `components/app-shell/install-education-card.tsx` | 0/1 (P09) |
| Offline / states | `/offline`, list states | `components/app-shell/offline-banner.tsx`, `components/common/{state-view,skeleton-card,toast}.tsx` | 0/1 |
| App shell | all `(app)/*` | `components/app-shell/{app-header,bottom-nav}.tsx`, `app/[locale]/(app)/layout.tsx` | 0/1 |
| Admin dashboard | `/admin/*` | `app/admin/*`, `features/admin/*` | 2 (restaurant/menu CRUD) |
| Restaurants & map · scan · feedback · permission | `/restaurants`, `/scan`, `/feedback` | *not yet built* | 2–4 |

## Shared component kit (built, `sb-*` + lucide)

`StatusBadge`, `ConfidenceMeter`, `SourceBadge`, `RecommendationCard`, `DishCard`, `LanguageToggle`, `SafetyNotice`, `AllergyCardDisplay`, `QuestionCardDisplay`, `OfflineBanner`, `BottomNav`, `AppHeader`, `InstallEducationCard`, `SkeletonCard`, `StateView`, `Toast`, `AdminDataTable`.

Reuse these before writing new UI. When a screen needs a pattern the mock already shows, port it from the showcase rather than inventing a new one.
