# UI/UX Design-Integration Guide — Phases 09–13

**Purpose.** Bind the verified SafeBite **design system v2** to the UI the impl agents build in phases
**09–13**. This is the *HOW-it-looks* layer; it does not change the *what/where* those phase files specify.
Agents copy the snippets below into the component files their phase already owns.

**Status: ADR-UI-01/02/03 APPROVED & WIRED (2026-07-08).** The infra is already applied — build straight on it.

**Sources of truth**
- Visual reference: `docs/design/safebite-ui-ux-mockups.html` (24 screens, light/dark).
- Verified tokens + rationale: `plans/…/reports/design-decisions-v2.md` (WCAG-checked 30-value status set).
- Tokens/preset (wired): `apps/web/src/app/tokens.safebite.css` · `apps/web/tailwind.safebite-preset.ts` · `apps/web/DESIGN_TOKENS.md`.
- Progress: `plans/…/reports/ui-ux-progress-tracker.md` — tick as you build.

**Non-negotiables (already enforced by the impl plan — restated):** status labels only
`Suitable · Ask First · Risky · Avoid · Unknown`; **Unknown never becomes Suitable**; every card shows
source/confidence/reason/action/last-checked; Suitable always renders `suitableCaveat`; forbidden copy blocked
by `copy:check`; status = **icon + label + colour** (never colour alone).

---

## 1. Current state (2026-07-08)
- ✅ built: domain/DB/seed/API/PWA-shell/Dexie/i18n (01–08); `app-header`, `bottom-nav`, `offline-banner`, `install-education`, `/home`, `/offline`.
- 🚧 in progress: **phase-09** (onboarding/allergy-card/profile) — don't edit its files; it will re-read this guide.
- ☐ pending: phase-10 (dishes), 11 (question card), 12 (admin), 13 (tests) — **build against this guide**.
- Re-skin later (small): the shell (07/09) still uses first-pass tokens + emoji nav → migrate to `sb-*` + lucide when touched (ADR-UI-02).

---

## 2. Design decisions — APPROVED & APPLIED

### ADR-UI-01 — `sb-*` design-token system ✅ wired
`tokens.safebite.css` is `@import`ed in `globals.css`; the `safebite` preset is in `tailwind.config.ts`
`presets:[…]`. Use the **`sb-*`** namespace in all new UI (verified, colour-blind-safe, AA/AAA, light+dark):
surfaces `bg-sb-surface`/`-surface-2`/`-surface-3`, text `text-sb-fg`/`text-sb-muted`/`text-sb-faint`,
`border-sb-border`, brand `bg-sb-primary text-sb-primary-foreground` / `text-sb-brand`, elevation
`shadow-sb-e1..e4`, radius `rounded-sb-md`/`-lg`/`-xl`, focus `focus-visible:shadow-sb-focus`. **Do not add
the legacy single-value `status-*` tokens in new files** — the status trio comes from the preset.

### ADR-UI-02 — `lucide-react` icons ✅ added (dep in package.json)
No emoji as icons. Status glyphs (redundant encoding): `CircleCheck / MessageCircleQuestion / TriangleAlert /
OctagonX / CircleHelp` (newer lucide export: `CircleQuestionMark`). Nav: `House / UtensilsCrossed / IdCard /
MessageCircle / CircleUser`. **Never** `ShieldCheck` for a dish (implies "verified safe") — plain `Shield` for
the concept; bare `Check` only for neutral confirmations. Run `pnpm install` to pull the dep.

### ADR-UI-03 — shared state components ✅ created
`components/common/skeleton-card.tsx`, `state-view.tsx` (empty/error), `toast.tsx` (success) exist and are
dependency-free (icon passed as a node). Reduced-motion is honoured globally (rule shipped in `tokens.safebite.css`).

---

## 3. Shared component kit — spec + ready-to-paste

Snippets follow repo conventions: `'use client'` where interactive, `useTranslations()` (no hardcoded
strings), `sb-*` tokens (no raw hex), `@/i18n/navigation` links, <~200 lines/file.

### StatusBadge — `components/status/status-badge.tsx` (owner: phase-10)
```tsx
'use client';
import { useTranslations } from 'next-intl';
import { CircleCheck, MessageCircleQuestion, TriangleAlert, OctagonX, CircleHelp } from 'lucide-react';
import type { RecommendationStatus } from '@safebite/domain';

const MAP = {
  suitable:  { Icon: CircleCheck,           c: 'text-sb-status-suitable-fg bg-sb-status-suitable-bg border-sb-status-suitable-border' },
  ask_first: { Icon: MessageCircleQuestion, c: 'text-sb-status-ask-first-fg bg-sb-status-ask-first-bg border-sb-status-ask-first-border' },
  risky:     { Icon: TriangleAlert,         c: 'text-sb-status-risky-fg bg-sb-status-risky-bg border-sb-status-risky-border' },
  avoid:     { Icon: OctagonX,              c: 'text-sb-status-avoid-fg bg-sb-status-avoid-bg border-sb-status-avoid-border' },
  unknown:   { Icon: CircleHelp,            c: 'text-sb-status-unknown-fg bg-sb-status-unknown-bg border-sb-status-unknown-border' },
} as const;

export function StatusBadge({ status }: { status: RecommendationStatus }) {
  const t = useTranslations('statuses');
  const { Icon, c } = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold ${c}`}>
      <Icon aria-hidden className="size-3.5" /> {t(status)}
    </span>
  );
}
```

### ConfidenceMeter — `components/status/confidence-badge.tsx` (owner: phase-10)
Hue-neutral (grey + word) — never a ladder hue, never a false-precise %.
```tsx
'use client';
import { useTranslations } from 'next-intl';
export function ConfidenceMeter({ level }: { level: 'low' | 'medium' | 'high' }) {
  const t = useTranslations('dishes');
  const on = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i < on ? 'bg-sb-muted' : 'bg-sb-border'}`} />
        ))}
      </span>
      <b className="text-xs text-sb-muted">{t(`confidence.${level}`)}</b>
    </span>
  );
}
```

### RecommendationCard — `components/safety/recommendation-card.tsx` (owner: phase-10)
Evidence block reused by dish list, dish detail, scan result. Suitable caveat baked in so no consumer forgets it.
```tsx
'use client';
import { useTranslations } from 'next-intl';
import type { DishRecommendationCard, LanguageCode } from '@safebite/domain';
import { StatusBadge } from '@/components/status/status-badge';
import { ConfidenceMeter } from '@/components/status/confidence-badge';

export function RecommendationCard({ card, lang }: { card: DishRecommendationCard; lang: LanguageCode }) {
  const t = useTranslations('dishes');
  const chip = 'rounded-full border border-sb-border bg-sb-surface-2 px-2.5 py-1 text-xs text-sb-muted';
  return (
    <article className="rounded-sb-md border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-sb-fg">{card.name[lang]}</h3>
        <StatusBadge status={card.status} />
      </header>
      <dl className="mt-3 grid gap-1.5 border-t border-sb-border pt-3 text-[13px] text-sb-fg">
        <div className="flex gap-2"><dt className="w-20 shrink-0 font-semibold text-sb-muted">{t('reason')}</dt><dd>{card.reason[lang]}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 font-semibold text-sb-muted">{t('action')}</dt><dd>{card.action[lang]}</dd></div>
      </dl>
      <footer className="mt-3 flex flex-wrap items-center gap-2">
        <ConfidenceMeter level={card.confidence} />
        <span className={chip}>{card.source}</span>
        <span className={chip}>{t('lastChecked', { date: card.lastCheckedAt })}</span>
      </footer>
      {card.status === 'suitable' && (
        <p className="mt-3 rounded-xl bg-sb-surface-2 p-2.5 text-xs text-sb-muted">{t('suitableCaveat')}</p>
      )}
    </article>
  );
}
```

### State components (already created — import & use)
```tsx
import { SkeletonCard } from '@/components/common/skeleton-card';   // loading > 200ms
import { StateView } from '@/components/common/state-view';         // empty / error
import { Toast } from '@/components/common/toast';                  // success (role=status)
// empty /dishes:  <StateView icon={<Search className="size-8"/>} title={t('emptyNotSeeded')} action={…}/>
// scan error:     <StateView icon={<Camera className="size-8"/>} title={t('scanFailed')} action={<RetryBtn/>}/>
// saved:          <Toast icon={<CircleCheck className="size-5"/>} message={t('saved')} />
```

### Other kit components (spec only — build in the owning phase)
| Component | File · owner | Design notes (mockup section) |
|---|---|---|
| SourceBadge / meta chips | `components/status/source-badge.tsx` · 10 | `Clock`+last-checked, `Link2`+source, `WifiOff`+offline; `text-xs text-sb-muted`, chip `border-sb-border bg-sb-surface-2`. |
| DishCard | `features/dishes/dish-card.tsx` · 10 | Name `Link` (via `@/i18n/navigation`) → detail; embeds `RecommendationCard`. |
| LanguageToggle | `components/common/language-toggle.tsx` · 10 | Segmented; active `bg-sb-primary text-sb-primary-foreground`; flips **data** lang only. |
| SafetyNotice | `components/safety/safety-notice.tsx` · 09 | `role="note"`, calm `bg-sb-surface-2 text-sb-muted` (**not** amber alarm), `Info` icon, `safetyDisclaimer`. |
| OfflineBanner | exists (07) — re-skin | Ask-first amber tint (`sb-status-ask-first-*`), `WifiOff`, `offlineNotice`; non-blocking. |
| AllergyCardDisplay | `features/allergy-card/…` · 09 | Brand-tint card; EN **and** VI; `IdCard`; "Available offline · Last updated". |
| QuestionCardDisplay | `components/safety/…` · 11 | Big blocks per `section.kind`; `largeText` scales type; fullscreen `fixed inset-0 z-50` on `bg-sb-surface`. |
| BottomNav | exists (07) — re-skin | Emoji → lucide (`House/UtensilsCrossed/IdCard/MessageCircle/CircleUser`); active = tinted pill; ≥48px; safe-area. |
| AdminDataTable | `components/admin/…` · 12 | Desktop table; risk-level chip via `StatusBadge` styling; `review_status` filter; tabular figures. |

---

## 4. Per-screen design mapping (→ mockup section)
| Screen / route | Phase | Mockup section | Notes |
|---|---|---|---|
| `/onboarding` | 09 | Landing → Onboarding | 3-dot progress; searchable allergen chips; severity radios; disclaimer card; one bottom CTA. |
| `/allergy-card` | 09 | Trust · Allergy card | Brand-tint, EN+VI, `SafetyNotice`, offline + last-updated. |
| `/profile` | 09 | Profile & install | Summary chip; install-education (coral-tint OK, decorative); danger "Clear data". |
| `/dishes` | 10 | Main flow · Dish guide | Filter chips + counts; groups **Avoid→Risky→Ask First→Unknown→Suitable**; EN/VI toggle; safety reminder; `SkeletonCard` load; `StateView` empty/error/offline. |
| `/dishes/[id]` | 10 | Dish detail | Names EN/VI; ingredient + hidden-ingredient chips; `RecommendationCard`; "Generate question card" CTA. |
| `/question-card` | 11 | Question card | Big blocks; EN/VI target toggle; large-text; fullscreen overlay; copy → `Toast`; "Available offline". |
| `/admin/*` | 12 | Admin dashboard | Desktop sidebar+table; `StatusBadge`; `review_status` filter. Severe-report queue + OCR review = Phase 3–5 (reference only). |
| home / offline | 07/09 | Home / Offline mode | Re-skin: emoji→lucide; brand greeting; disabled "Find food near me · Coming later". |

Phase 2–4 screens (location permission, menu scan/OCR, feedback, severe-reaction handling) are mocked but out of Phase 0/1 — reference only.

---

## 5. Global checklist (every screen)
- Touch targets ≥48px; visible focus ring (`focus-visible:shadow-sb-focus`).
- Colour never the sole signal (status = icon+label+colour; allergen chips carry text).
- Primary CTA bottom-anchored, full-width (thumb zone); destructive far (top corner).
- Type ≥14px for actionable text; 16px inputs (no iOS zoom); tabular figures for timestamps.
- Light + dark verified; `prefers-reduced-motion` respected (global rule shipped).
- `sb-*` tokens only (no raw hex; no legacy single-value `status-*`); links via `@/i18n/navigation` (admin island excepted per phase-12 ADR).
