# Phase 16 — Shell & Phase-09 Re-skin to Design System v2

## Context

The verified design system (`sb-*` tokens + lucide icons) is **already wired** — `globals.css` imports
`tokens.safebite.css`, `tailwind.config.ts` registers the `safebite` preset, `lucide-react` is installed.
Phases **10/11/12** were built on it and already match the HTML mock (`docs/design/safebite-ui-ux-mockups.html`).
But the shell + **Phase-09** screens were committed *before* the design system landed (`492cacf` Phase 09 sits
below the design commit `36d3a71`), so they still wear the **first-pass palette** (`bg-background`/`bg-muted`/
`bg-safety`/`text-muted-foreground`) and **emoji nav icons**. This phase re-skins those files so the *live app*
matches the mock end-to-end. It closes tracker task **A2b** and the "re-skin when touched" note.

**Pure presentation change** — no logic, data, routing, i18n-key, or behavior changes; only Tailwind classes and
emoji→lucide swaps.

## Context Links
- Design spec + ready-to-paste snippets: `reports/ui-ux-design-integration-guide.md`
- Token reference: `apps/web/DESIGN_TOKENS.md`, `apps/web/src/app/tokens.safebite.css`
- Visual reference: `docs/design/safebite-ui-ux-mockups.html` (per-screen sections named below)
- Progress tracker: `reports/ui-ux-progress-tracker.md` (tick §A A2b + §C rows on completion)
- Rule constraints (unchanged): `useTranslations` for copy, `@/i18n/navigation` for links (public app),
  semantic tokens only, status = icon + label + colour, no forbidden safety copy.

## Overview
- **Priority:** Medium (visual consistency; not a functional blocker — the app already renders).
- **Current status:** ✅ Done — verified 2026-07-08. Re-skinned all 13 shell/Phase-09 files to design system v2 (`sb-*` tokens + lucide icons), pure presentation (no logic/data/routing/i18n-key change). `bottom-nav` now uses lucide glyphs (House/UtensilsCrossed/IdCard/MessageCircle/CircleUser) with an active `bg-sb-brand-soft text-sb-brand` pill + ≥48px targets + safe-area; `SafetyNotice` is the calm neutral `bg-sb-surface-2`+`Info` (amber reserved for Ask-First); `OfflineBanner` uses the Ask-First tint + `WifiOff`; landing/home reuse `<SafetyNotice />` (DRY); allergy card is brand-tinted; profile "Clear data" uses `sb-status-avoid`. **Checks:** grep of the 13 files → 0 legacy tokens (`bg-background|bg-muted|text-muted-foreground|border-border|bg-safety|text-safety|text-status-|bg-status-|rounded-lg`), 0 emoji, 0 raw hex; `pnpm typecheck`/`lint`/`copy:check` green; production build succeeds and `/en`, `/en/home`, `/en/onboarding`, `/en/allergy-card`, `/en/offline`, `/en/profile`, `/vi` all serve 200. Independent of Phase 14/15 (confirmed).
- **Scope:** 13 files (below) still on first-pass tokens; `bottom-nav.tsx` also on emoji.
- **Out of scope:** Phase 2–4 mock screens (restaurants/map, scan/OCR, feedback, admin severe-queue/OCR review) —
  no active build phase; leave as mock preview.

## Key Insights
- **Additive foundation already exists** — no new deps/tokens; this is class-swaps only. The old `--background`/
  `--muted`/`--safety` tokens stay defined (harmless), so nothing breaks mid-migration.
- **Two neutral systems map cleanly**: the first-pass base tokens are a subset of `sb-*`. See the mapping table.
- **`SafetyNotice` changes intent**: the mock is **calm neutral** (`bg-sb-surface-2` + `text-sb-muted` + `Info`
  icon), NOT the amber `bg-safety` alarm. Amber is reserved for the Ask-First status only.
- **`bottom-nav` is the only emoji file** — swap to lucide (`House / UtensilsCrossed / IdCard / MessageCircle /
  CircleUser`), active item = tinted pill (`bg-sb-brand-soft text-sb-brand`), ≥48px targets, safe-area padding.
- **These files are committed/done (phases 02/07/09)** and not on any active agent's edit path (Phase 11 done,
  Phase 13 works on tests/CI/guard) → low collision risk. Quick-check `git status` before editing `bottom-nav.tsx`.
- **Behavior must be identical** — keep every `useTranslations` key, `@/i18n/navigation` `Link`, `aria-*`, and
  disabled/offline logic exactly as-is; only `className`/icon nodes change.

## Token & icon mapping (apply consistently)

| First-pass (remove) | → Design system v2 (`sb-*`) |
|---|---|
| `bg-background` (page) / (card) | `bg-sb-bg` (page) / `bg-sb-surface` (card) |
| `bg-muted` | `bg-sb-surface-2` (or `-surface-3` for nested) |
| `text-foreground` | `text-sb-fg` |
| `text-muted-foreground` | `text-sb-muted` |
| `border-border` | `border-sb-border` |
| `bg-safety` / `text-safety` (SafetyNotice) | `bg-sb-surface-2` / `text-sb-muted` + `Info` icon |
| `text-status-<s>` | `text-sb-status-<s>-fg` (chips: `+ bg-sb-status-<s>-bg border-sb-status-<s>-border`) |
| `bg-foreground text-background` (primary CTA) | `bg-sb-primary text-sb-primary-foreground` |
| `rounded-lg` | `rounded-sb-md` (cards) / `-sm` (buttons/inputs) |
| flat card | add `shadow-sb-e1`; sheets `-e2`; interactive `focus-visible:shadow-sb-focus` |
| emoji nav icons | `lucide-react` glyphs (see below); `aria-hidden` on the glyph |
| status shown by colour only | status = lucide icon + label + colour (a11y) |

Status glyphs: `CircleCheck / MessageCircleQuestion / TriangleAlert / OctagonX / CircleHelp`. Never `ShieldCheck`
for a dish. Icon size 20–24px; touch targets ≥48px.

## Related Code Files (13 — re-skin only)

**App-shell components (do first — screens compose them):**
- `apps/web/src/components/app-shell/bottom-nav.tsx` — emoji → lucide; active tinted pill; `sb-*`. Mock: phone nav.
- `apps/web/src/components/app-shell/app-header.tsx` — `sb-*`; optional back = lucide `ChevronLeft` (44px hit).
- `apps/web/src/components/app-shell/offline-banner.tsx` — Ask-First tint (`sb-status-ask-first-*`) + `WifiOff`. Mock: "Offline mode".
- `apps/web/src/components/app-shell/install-education-card.tsx` — brand/appetite tint; lucide `Share`/`SquarePlus`. Mock: "Profile & install".
- `apps/web/src/components/safety/safety-notice.tsx` — neutral calm notice + `Info`. Mock: onboarding/home notice.

**Screens (features + routes):**
- `apps/web/src/app/[locale]/page.tsx` — landing. Mock: "Landing".
- `apps/web/src/app/[locale]/layout.tsx` — root body surface → `bg-sb-bg text-sb-fg`.
- `apps/web/src/app/[locale]/(app)/home/page.tsx` — Mock: "Home" (brand greeting card, `sb-*` CTAs, disabled "Coming later").
- `apps/web/src/app/[locale]/offline/page.tsx` — Mock: "Offline mode".
- `apps/web/src/features/onboarding/onboarding-wizard.tsx` — Mock: "Onboarding" (3-dot progress, chips, radios).
- `apps/web/src/features/onboarding/onboarding-steps.tsx` — step bodies → `sb-*` chips/radios/CTA.
- `apps/web/src/features/allergy-card/allergy-card-display.tsx` — Mock: "Allergy card" (brand-tint, EN+VI).
- `apps/web/src/features/profile/profile-view.tsx` — Mock: "Profile & install" (summary chip, danger "Clear data").

**Do NOT modify:** any `messages/*.json` (no copy changes), any Phase-10/11/12 file (already `sb-*`), tokens/preset.

## Implementation Steps
1. Confirm foundation (already ✅): `sb-*` import in `globals.css`, `presets:[safebite]`, `lucide-react` installed. Quick `git status` on the 13 files to ensure none is mid-edit by another agent.
2. **Re-skin app-shell** (bottom-nav → lucide + tinted active pill; app-header; offline-banner; install-education; safety-notice). Reuse guide §3 specs/snippets.
3. **Re-skin screens** landing → layout → home → onboarding (wizard + steps) → allergy-card → profile → offline, per the mapping table + mock section. Keep all `useTranslations`/`Link`/`aria`/logic identical.
4. For every status rendered, ensure icon + label + colour (import from `lucide-react`); ensure ≥48px targets + `focus-visible:shadow-sb-focus` on interactive elements.
5. Self-check per the Success Criteria; fix; do a light light/dark visual pass against the mock.

## Todo List
- [x] `bottom-nav.tsx` — emoji → lucide, active pill, sb-* (closes A2b)
- [x] `app-header.tsx`
- [x] `offline-banner.tsx`
- [x] `install-education-card.tsx`
- [x] `safety-notice.tsx` (neutral, not amber)
- [x] `[locale]/page.tsx` (landing)
- [x] `[locale]/layout.tsx` (body surface)
- [x] `(app)/home/page.tsx`
- [x] `[locale]/offline/page.tsx`
- [x] `onboarding-wizard.tsx`
- [x] `onboarding-steps.tsx`
- [x] `allergy-card-display.tsx`
- [x] `profile-view.tsx`
- [x] Verify: typecheck / lint / copy:check green; grep the 13 files → 0 legacy tokens, 0 emoji; light+dark pass

## Success Criteria
- Grep of the 13 files for `bg-background|bg-muted|text-muted-foreground|border-border|bg-safety|text-safety|text-status-` → **0 matches**; emoji grep → **0**.
- `bottom-nav` renders lucide icons with an active tinted pill; all nav targets ≥48px.
- Every status renders **icon + label + colour**; visible focus rings; light **and** dark verified against the mock.
- `pnpm typecheck` / `pnpm lint` pass; `pnpm copy:check` unaffected by these files; no raw hex introduced.
- **Zero behavior change**: same routes, same `useTranslations` keys, same `@/i18n/navigation` links, same offline/disabled logic. Playwright happy path (phase-13) still green.

## Risk Assessment
- **Concurrent edit collision** — mitigate: these are committed phase-02/07/09 files off the active agents' paths; `git status`-check before editing (esp. `bottom-nav.tsx`, referenced by Phase-11). If modified, coordinate.
- **Accidental behavior/i18n change** — mitigate: class/icon swaps only; diff-review that no `t(...)` key, `href`, `aria`, or conditional changed.
- **Dark-mode regression** — mitigate: `sb-*` ships light+dark; spot-check both themes per screen.
- **SafetyNotice intent drift** — mitigate: use neutral tokens (not amber); amber stays Ask-First-only.
- **Reintroducing raw hex / forbidden copy** — mitigate: `sb-*` classes only; `copy:check` + a raw-hex grep on the 13 files.

## Next Steps
- **Depends on:** design system already wired (done). Independent of Phase 13 (tests/CI) and Phase 2–4.
- **Unblocks:** full mock↔live parity for Phase 0/1; the phase-13 Playwright/visual QA then validates the real UI against the mock.
- **After this:** the only remaining mock screens are Phase 2–4 (out of scope) — schedule with those phases.
