# SafeBite Design Tokens v2 — integration guide

Additive, namespaced (`--sb-*` / `sb-*`) design system generated from the verified
research doc (`plans/…/reports/design-decisions-v2.md`). Every colour pair is WCAG 2.2
contrast-checked. **Nothing here overwrites the existing `globals.css` / `tailwind.config.ts`**
— you opt in with two one-line changes.

## Files
| File | What it is |
|---|---|
| `src/app/tokens.safebite.css` | CSS custom properties (`--sb-*`), HSL channel triplets, light + dark + reduced-motion |
| `tailwind.safebite-preset.ts` | Tailwind v3 preset exposing `sb`-namespaced colours, radius, shadow, type, motion |
| `DESIGN_TOKENS.md` | this guide |

## Integrate (2 lines)

**1. `src/app/globals.css`** — add as the **first** line (CSS `@import` must precede other rules):
```css
@import './tokens.safebite.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**2. `tailwind.config.ts`** — register the preset:
```ts
import safebite from './tailwind.safebite-preset';

const config: Config = {
  presets: [safebite],                 // ← add this
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { /* your existing tokens stay */ } },
};
```
Presets deep-merge; your current tokens remain. Dark mode: the CSS already handles
`prefers-color-scheme` **and** a manual `[data-theme="dark"]` / `.dark` toggle.

## Cheatsheet (semantic classes — never raw hex)

| Need | Class |
|---|---|
| Page canvas / card / nested | `bg-sb-bg` · `bg-sb-surface` · `bg-sb-surface-2` · `bg-sb-surface-3` |
| Text primary / secondary / faint | `text-sb-fg` · `text-sb-muted` · `text-sb-faint` |
| Primary button | `bg-sb-primary text-sb-primary-foreground` |
| Brand text / link (light ≥14px) | `text-sb-brand` · dense/small → `text-sb-brand-ink` |
| Brand tint fill (chips, active nav) | `bg-sb-brand-soft text-sb-brand-ink` |
| Appetite accent (**fill/decorative only**) | `bg-sb-appetite-soft text-sb-appetite-ink` — never on assessment UI |
| Status chip (e.g. Avoid) | `text-sb-status-avoid bg-sb-status-avoid-bg border border-sb-status-avoid-border` |
| Border / control border | `border-sb-border` · `border-sb-border-strong` |
| Radius | `rounded-sb-sm` (12) · `-sb-md` (16) · `-sb-lg` (22) · `-sb-xl` (28) |
| Elevation | `shadow-sb-e1` … `shadow-sb-e4` |
| Focus ring | `focus-visible:shadow-sb-focus` |
| Type | `text-sb-h1` · `text-sb-title` · `text-sb-body` · `text-sb-label` · `text-sb-caption` |
| Touch target | `min-h-sb-tap min-w-sb-tap` (48px) |
| Motion | `duration-sb-std ease-sb-standard` · `animate-sb-shimmer` · `animate-sb-spin` |

Spacing = Tailwind defaults on the 8pt grid: `2`=8 · `3`=12 · `4`=16 · `6`=24 · `8`=32 · `12`=48 · `16`=64.

## Status ladder — icon + label + colour (never colour alone)

Status is **always** rendered as Lucide icon **+** i18n label **+** colour. Labels come from
`next-intl` (no hardcoded strings). Icons (add `lucide-react`):

| Status | token key | Lucide (`lucide-react`) |
|---|---|---|
| Suitable | `status-suitable` | `CircleCheck` |
| Ask First | `status-ask-first` | `MessageCircleQuestion` |
| Risky | `status-risky` | `TriangleAlert` |
| Avoid | `status-avoid` | `OctagonX` |
| Unknown | `status-unknown` | `CircleQuestionMark` (older lucide: `CircleHelp`) |

```tsx
// Do NOT use ShieldCheck for a dish (implies "verified safe"). Plain Shield = risk-reduction concept.
<span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
                 text-sb-label text-sb-status-avoid bg-sb-status-avoid-bg border-sb-status-avoid-border">
  <OctagonX className="size-3.5" aria-hidden />
  {t('status.avoid')}
</span>
```

## Rules baked into the system (keep them)
- **Never map brand blue into the status ladder.** Status hues are semantic-only.
- **Coral (`sb-appetite*`) is fill/decorative only** — never in status chips, allergen rows,
  confidence meters, dish cards that show a status, or error/success states.
- **Confidence is hue-neutral** (grey segments + word High/Medium/Low), never the ladder hues,
  and never a false-precise %.
- **Colour is never the sole signal** (icon silhouette + text label always present) — WCAG 1.4.1.
- Touch targets ≥48px; visible focus ring; respect `prefers-reduced-motion` (already wired in the CSS).
- Missing data resolves toward **Unknown / Ask First**, never Suitable.

Full rationale, the 30-value contrast table, and the ~32 principle applications live in
`plans/20260708-1335-safebite-phase-0-1-implementation/reports/design-decisions-v2.md`, with the
visual reference at `docs/design/safebite-ui-ux-mockups.html`.
