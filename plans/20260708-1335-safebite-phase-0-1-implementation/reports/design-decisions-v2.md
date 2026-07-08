# SafeBite UI/UX — Design Decisions v2

**Positioning:** risk reduction, not risk elimination · **Tone:** calm, transparent, conservative, non-alarmist · **Context:** stressed / hungry / one-handed on 4G, bilingual EN–VI
**Deliverable:** self-contained HTML showcase — no runtime network, icons inline SVG, fonts system-stack, backgrounds pure CSS.
**Status ladder (only these labels):** Suitable · Ask First · Risky · Avoid · Unknown — always rendered as **icon silhouette + text label + color** (never color alone).
**Forbidden copy anywhere:** "guaranteed safe", "100% safe", "allergy-proof", "this dish is safe", "verified_safe".

> **Verifier corrections applied in this version (do not silently revert):**
> 1. Status token set = the 30-value computationally-verified set from the safety research (all text ≥4.5:1, all borders ≥3:1) — shipped as-is.
> 2. Icon renames: `message-circle-question` → **`message-circle-question-mark`**; `circle-help` → **`circle-question-mark`** (Lucide renamed these; glyph unchanged).
> 3. White-on-coral text is **removed**, not merely restricted — coral is fill/decorative only; coral-associated text uses `--appetite-ink` on `--appetite-soft`.
> 4. The "28% fewer errors" healthcare stat is **removed**; cool-slate rationale stated as design reasoning only.
> 5. `--brand #0b6bd6` (5.14:1) and `--faint #64748b` (4.76:1) pass AA but fail AAA — use only for ≥14px normal-weight text; dense/small brand text uses `--brand-ink #0a4da0` (8.13:1).
> 6. Never use Facebook `#1877F2` (4.23:1) or dark-brand `#5aa2ff` as text on white; enforce the light/dark brand split.
> 7. Confidence meter is **hue-neutral** (grayscale segments + word), never the ladder hues, to avoid risk/confidence mental-model collision.
> 8. Library figures corrected: Heroicons ≈300 base icons; Tabler 6,100+.
> 9. License text (ISC + Feather MIT) must be pasted **verbatim** from the repo LICENSE at build time, not retyped.
> 10. `--text` on white is ≈**17.9:1** (research understated it as 16.9 — safe direction).

---

## 1. Design token set

Two blocks: `:root` (light) and `:root[data-theme="dark"]` / `@media (prefers-color-scheme: dark)`. All values are ready-to-paste.

### 1.1 Light theme

```css
:root {
  /* ---- Background & surface ladder (4 levels) ---- */
  --bg:          #eceff4;   /* app canvas: a hair cooler/darker than card so resting cards read raised */
  --surface:     #ffffff;   /* L1 card / primary elevated */
  --surface-2:   #f6f8fb;   /* L2 inset / secondary / nested */
  --surface-3:   #eef2f7;   /* L3 active / hover / deeper nested */
  --overlay:     #ffffff;   /* sheet / modal — separated by --e4 shadow, not tint */
  --border:        #e2e8f0; /* hairline divider */
  --border-strong: #cbd5e1; /* control border */

  /* ---- Text (all AA/AAA on --surface) ---- */
  --text:  #0f172a;   /* ~17.9:1 (AAA) */
  --muted: #475569;   /* 7.58:1 (AAA) */
  --faint: #64748b;   /* 4.76:1 (AA) — ≥14px normal weight ONLY; never micro-labels/timestamps text */

  /* ---- Ocean-blue brand ramp ---- */
  --brand-50:  #eef6ff;
  --brand-100: #d9ebff;
  --brand-200: #b8dbff;
  --brand-300: #86c3ff;
  --brand-400: #5aa2ff;   /* = dark-mode primary; do NOT use as text on white (2.61:1) */
  --brand-500: #2b84f0;
  --brand-600: #0b6bd6;   /* PRIMARY on light: 5.14:1 (AA). ≥14px normal-weight text only */
  --brand-700: #0a4da0;   /* --brand-ink: 8.13:1 (AAA) — dense/small brand text, links in body */
  --brand-800: #0b3f80;
  --brand-900: #0b2f5c;
  --brand:      var(--brand-600);
  --brand-ink:  var(--brand-700);
  --brand-soft: #eef6ff;  /* tinted brand background (chips, active nav pill) */
  /* NEVER map brand blue into the status ladder. Facebook #1877F2 (4.23:1) forbidden as text on white. */

  /* ---- ONE warm appetite accent (coral) — FILL/DECORATIVE ONLY ---- */
  --appetite:      #ef6851; /* 3.10:1 on white → decorative fill only, never text/small-icon color */
  --appetite-soft: #fff1ee; /* tinted background for coral chips/sections */
  --appetite-ink:  #b23f2f; /* 5.23:1 on --appetite-soft — the ONLY coral-associated text color */
  /* USE coral for: favorite/save heart, "Explore local dishes" discovery headers, food-culture cards,
     onboarding highlights, streak/promo badges, illustration warmth.
     FORBID coral in: any assessment surface (status chips, allergen rows, confidence meter),
     any dish card that also shows a status, error/success states, or within one card of a Risky/Avoid chip.
     White-on-coral text is DISALLOWED (3.10:1). Coral CTAs are secondary; label uses --appetite-ink,
     or the button is a tinted --appetite-soft surface. Primary "Check this dish" CTA stays BLUE. */

  /* ---- Elevation (4 levels; two-shadow contact+ambient) ---- */
  --e1: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04);      /* resting card */
  --e2: 0 2px 4px rgba(15,23,42,.06), 0 8px 20px rgba(15,23,42,.08);     /* raised / sticky bottom-nav */
  --e3: 0 6px 16px rgba(15,23,42,.10), 0 12px 32px rgba(15,23,42,.10);   /* popover / menu / toast */
  --e4: 0 12px 28px rgba(15,23,42,.14), 0 24px 60px rgba(15,23,42,.18);  /* bottom sheet / modal */

  /* ---- Radius ramp (6 steps) ---- */
  --r-xs:   8px;    /* tags, small chips */
  --r-sm:   12px;   /* buttons, inputs, segmented controls */
  --r-md:   16px;   /* standard cards */
  --r-lg:   22px;   /* large / hero / image cards */
  --r-xl:   28px;   /* bottom sheets, modal, phone-frame inner */
  --r-full: 999px;  /* status chips, avatars, FAB, toggles, confidence dots */
  /* Nesting rule: inner radius = outer − padding (16px card, 4px pad → 12px inner button). */

  /* ---- 8pt spacing scale (4px half-step) ---- */
  --space-0: 4px;   --space-1: 8px;   --space-2: 12px;  --space-3: 16px; /* default gutter & rhythm */
  --space-4: 24px;  --space-5: 32px;  --space-6: 48px;  --space-7: 64px;
  --content-max: 480px;  /* centered column max-width on tablet/desktop */

  /* ---- Modular type scale (name → px / line-height / weight), 16px base ~1.2 minor third ---- */
  --font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* network-free */
  --font-display: 700 28px/34px var(--font-stack);
  --font-h1:      700 24px/30px var(--font-stack);
  --font-h2:      700 20px/26px var(--font-stack);
  --font-title:   600 18px/24px var(--font-stack);
  --font-body-l:  400 17px/24px var(--font-stack);
  --font-body:    400 16px/24px var(--font-stack); /* base; also min input size to block iOS auto-zoom */
  --font-body-s:  400 14px/20px var(--font-stack); /* floor for actionable text */
  --font-label:   600 13px/18px var(--font-stack); /* nav/status labels; +0.3px tracking optional */
  --font-caption: 400 12px/16px var(--font-stack); /* legal/timestamps ONLY */

  /* ---- Touch, motion, misc ---- */
  --tap-min: 48px;  --tap-gap: 8px;                 /* 16px gap near destructive actions */
  --nav-height: 56px;
  --safe-bottom: max(12px, env(safe-area-inset-bottom));
  --safe-x: max(16px, env(safe-area-inset-left));
  --dur-feedback: 100ms; --dur-standard: 200ms; --dur-enter: 300ms; --dur-exit: 250ms;
  --dur-shimmer: 1200ms; --skeleton-delay: 200ms; --toast-duration: 4000ms;
  --ease-standard:   cubic-bezier(0.2, 0, 0, 1);
  --ease-emph-decel: cubic-bezier(0.05, 0.7, 0.1, 1); /* entrances */
  --ease-emph-accel: cubic-bezier(0.3, 0, 0.8, 0.15); /* exits */
  --focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--brand); /* ≥3:1, keyboard/switch users */

  /* ---- Hero mesh + grain + photo scrim (pure CSS, no remote assets) ---- */
  --hero-bg:
    radial-gradient(120% 130% at 8% -10%, #e7f1ff 0%, rgba(231,241,255,0) 55%),
    radial-gradient(120% 120% at 100% -20%, #ffe9df 0%, rgba(255,233,223,0) 48%), /* warm corner only */
    linear-gradient(180deg, #f4f8fd 0%, #eceff4 100%);
  --noise:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --noise-opacity: .04; --noise-blend: soft-light; /* hero/brand surfaces only; body stays flat */
  --photo-scrim: linear-gradient(180deg, rgba(6,10,20,0) 40%, rgba(6,10,20,.72) 100%);
}
```

### 1.2 Dark theme

```css
:root[data-theme="dark"], /* explicit toggle wins */ 
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  /* Elevation in dark = LIGHTER surface + hairline top-highlight; shadow is a faint ambient hint only.
     Canvas is near-black navy, NOT pure #000 (avoids OLED smear/halation). */
  --bg:        #0a0f1a;  --surface:   #0f172a;  --surface-2: #16213a;
  --surface-3: #1e293b;  --overlay:   #24324a;                 /* lightest = highest elevation */
  --hairline-top: rgba(255,255,255,.06);                        /* 1px top border sells raised edges */
  --border: #24324a;     --border-strong: #33415c;

  --text:  #e2e8f0;  /* 14.48:1 on --surface */
  --muted: #94a3b8;  /* 6.96:1 on --surface; stays ≥5:1 on all four dark levels */
  --faint: #7c8ba3;

  --brand:      #5aa2ff;  /* 6.84:1 on --surface — dark PRIMARY / text / active nav */
  --brand-ink:  #86c3ff;  /* denser text on dark */
  --brand-soft: rgba(90,162,255,.14);
  --appetite:      #ff7a66;
  --appetite-soft: rgba(239,104,81,.14);
  --appetite-ink:  #ff9d8c; /* coral text on dark coral-soft only */

  --e1: 0 1px 2px rgba(0,0,0,.4);
  --e2: 0 2px 6px rgba(0,0,0,.5);
  --e3: 0 8px 24px rgba(0,0,0,.55);
  --e4: 0 20px 48px rgba(0,0,0,.65);
  --focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--brand);

  --hero-bg:
    radial-gradient(120% 130% at 8% -10%, #14233f 0%, rgba(20,35,63,0) 55%),
    radial-gradient(120% 120% at 100% -20%, #2b1a12 0%, rgba(43,26,18,0) 46%),
    linear-gradient(180deg, #0d1627 0%, #0a0f1a 100%);
  --noise-opacity: .06; --noise-blend: overlay;
} }
```

### 1.3 Status tokens (fg / bg / border, light + dark) — color-blind-safe, verified

All text pairs ≥4.5:1 (light AA/AAA; dark all AAA). All borders ≥3:1 vs page **and** vs fill (WCAG 1.4.11). The icon inherits `fg`, so icon contrast = text contrast (always ≥3:1). Color-blind safety comes from the **distinct silhouette + label**, not hue.

| Status | Light fg / bg / border | Dark fg / bg / border | Lucide icon (24×24 stroke) | Text ratio (L / D) |
|---|---|---|---|---|
| **Suitable** | `#05603a` / `#e7f6ef` / `#1f8f60` | `#7ee6b8` / `#0f2b20` / `#3f9d72` | `circle-check` | 6.87 / 10.02 |
| **Ask First** | `#7a5200` / `#fdf4e3` / `#a9812a` | `#f5cf7a` / `#33280d` / `#a9842f` | `message-circle-question-mark` | 6.34 / 9.72 |
| **Risky** | `#9a3c00` / `#fdeee2` / `#c05a1e` | `#f7b184` / `#3a1e0e` / `#c07a4a` | `triangle-alert` | 6.13 / 8.44 |
| **Avoid** | `#a11212` / `#fdeaea` / `#cc2b2b` | `#f5a3a3` / `#3a1717` / `#c96b6b` | `octagon-x` | 6.95 / 8.10 |
| **Unknown** | `#3f4b5b` / `#eef1f5` / `#6b7787` | `#aeb9c7` / `#1c2534` / `#6b7789` | `circle-question-mark` | 7.82 / 7.75 |

```css
:root{
  --st-suit-fg:#05603a; --st-suit-bg:#e7f6ef; --st-suit-bd:#1f8f60;
  --st-ask-fg:#7a5200;  --st-ask-bg:#fdf4e3;  --st-ask-bd:#a9812a;
  --st-risk-fg:#9a3c00; --st-risk-bg:#fdeee2; --st-risk-bd:#c05a1e;
  --st-avoid-fg:#a11212;--st-avoid-bg:#fdeaea;--st-avoid-bd:#cc2b2b;
  --st-unk-fg:#3f4b5b;  --st-unk-bg:#eef1f5;  --st-unk-bd:#6b7787;
}
:root[data-theme="dark"]{
  --st-suit-fg:#7ee6b8; --st-suit-bg:#0f2b20; --st-suit-bd:#3f9d72;
  --st-ask-fg:#f5cf7a;  --st-ask-bg:#33280d;  --st-ask-bd:#a9842f;
  --st-risk-fg:#f7b184; --st-risk-bg:#3a1e0e; --st-risk-bd:#c07a4a;
  --st-avoid-fg:#f5a3a3;--st-avoid-bg:#3a1717;--st-avoid-bd:#c96b6b;
  --st-unk-fg:#aeb9c7;  --st-unk-bg:#1c2534;  --st-unk-bd:#6b7789;
}
```

**Implementation notes for status tokens**
- Borders were verified against page references **light `#ffffff`** / **dark `#0f1826`**. The app's dark card surface is `--surface #0f172a` (within ~1 luminance point of `#0f1826`), so contrast holds; still, run the build-time checker (§2.7) against the *actual* rendered surface after any hue edit.
- Two thinnest headrooms: Ask-First light border/fill = 3.28:1; Unknown dark border/fill = 3.39:1. Both pass, but this is exactly why the **border must never be the sole state signal** — the icon silhouette + label always render.
- **Confidence meter is NOT a status token.** Use a hue-neutral 3-segment bar (filled segments in `--muted`/`--text`) + the word **High / Medium / Low**. Never reuse ladder hues for confidence (prevents risk↔confidence confusion). Never show a false-precise percentage.

---

## 2. Icon system

### 2.1 Library + license (one line)
**Lucide (lucide.dev) — ISC license, with a Feather-derived subset under MIT (Cole Bemis); both permissive, inline-and-ship permitted, obligation satisfied by one bundled notice, no visible attribution, no network.**

### 2.2 Build obligation
Paste the **ISC notice AND the Feather MIT notice verbatim** from the repo's `LICENSE` file into a single HTML comment at the top of the showcase at build time — do **not** hand-retype or trust a paraphrased year/holder string. Fallback source, used **only** when Lucide lacks a glyph: **Tabler (MIT, 6,100+ icons, same 24×24 / 2px grid)** — never mix styles casually. (Rejected: Heroicons ≈300 base icons — too few for the allergen domain; Material Symbols — filled/variable-font, awkward to hand-inline; Phosphor — 256 viewBox + 6 weights invite drift.)

### 2.3 Stroke, canonical attributes, filled-vs-outline discipline
- **Stroke width token `--icon-stroke: 2`** — never thin to 1.5 (reads fragile/anxious), never fill (reads alarming). 2px round-cap reads steady/reassuring.
- Inline every glyph verbatim: `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`. Color comes only from `currentColor` (parent CSS / status `fg`), never hard-coded in the path — this is what lets one path serve every status color and satisfies "never color alone."
- **All glyphs outline-only.** Emphasis/active = a **filled tinted container behind** the outline glyph (soft brand/status pill), never a solid glyph swap.
- **Brand guardrail:** never use `shield-check` (or any check-badge) for a dish's safety — a checked shield implies the forbidden "verified safe." Use plain `shield` for the risk-reduction concept; reserve bare `check` for neutral confirmations (copied/saved).

### 2.4 Size tokens (never render Lucide below 16px)
```css
--icon-16:16px; /* dense inline metadata: last-checked clock, source, chip glyphs */
--icon-20:20px; /* DEFAULT in-content: list rows, inline status icons, field affordances */
--icon-24:24px; /* bottom-nav items, primary buttons, section headers */
--icon-28:28px; /* active bottom-nav item + primary Scan FAB (thumb-zone Fitts target) */
--icon-40:40px; /* empty / error / success state illustrations */
--icon-hit:44px; /* min touch target via CONTAINER padding, independent of glyph size */
--icon-contrast-min:3:1; /* glyph vs background, verified light AND dark */
```
Stroke scales with size (2px@24 → ~1.67@20 → ~1.33@16); accept it, never edit paths.

### 2.5 SafeBite glyph map (glyph name → description; inlined as 24×24 stroke SVGs)

**Status ladder (load-bearing silhouettes — maximally distinct outlines):**
| Glyph | Role |
|---|---|
| `circle-check` | Suitable — contained tick, calmly affirmed (NOT bare check, NOT shield-check) |
| `message-circle-question-mark` | Ask First — speech bubble + `?` = "go ask the restaurant" (an *action*) |
| `triangle-alert` | Risky — universal caution triangle |
| `octagon-x` | Avoid — stop-sign octagon = hard stop (`ban` acceptable alt) |
| `circle-question-mark` | Unknown — plain `?`-in-circle = *state* of no data (deliberately different silhouette from Ask First) |

**Core navigation & actions:**
| Glyph | Role |
|---|---|
| `house` | Home |
| `utensils-crossed` | Dishes / menu (alt `utensils`) |
| `id-card` | Allergy card (a card you present to staff) |
| `circle-user` | Profile |
| `map-pin` / `map` | Nearby pin / map view |
| `scan-line` / `camera` | Scan affordance / photo capture |
| `message-circle` | Talk to restaurant / chat |
| `shield` | Risk-reduction concept (plain — **never** `shield-check`) |
| `check` | Neutral confirmations only (copied, saved) |
| `clock` / `history` | Last-checked / data-staleness |
| `link-2` / `file-text` | Lay-friendly "source" citation (avoid `git-branch` for non-devs) |
| `wifi-off` / `cloud-off` | Offline / no-sync |
| `copy` | Copy phrase / card text |
| `maximize` / `minimize` | Fullscreen / exit |
| `a-large-small` | Large-text a11y toggle |
| `chevron-left` / `arrow-left` | Back / full-screen back |
| `filter` / `sliders-horizontal` | Filters |
| `search` | Search |

**Allergen sub-map (Lucide has NO `peanut` glyph — always pair with the allergen text label; icon alone is never sufficient for a medical allergen):**
| Allergen | Contains glyph | Free-from glyph |
|---|---|---|
| Peanut / tree-nut | `nut` | `nut-off` |
| Soy / legume | `bean` | — |
| Gluten / wheat | `wheat` | `wheat-off` |
| Dairy / milk | `milk` | `milk-off` |
| Egg | `egg` | `egg-off` |
| Fish | `fish` | `fish-off` |
| Shellfish / crustacean | `shrimp` | — |
| Sesame / sulphite / mustard / celery | labeled generic chip (dot + text) | — |

The slashed **`-off` family is the canonical "does-not-contain" grammar** (solid = contains, slashed = free-from). Confirm each `-off` page exists as you pull its SVG (only `nut-off` + base food glyphs directly verified; `peanut` confirmed absent).

**PWA install (platform-specific two-step, always labeled):** iOS → `share` then `square-plus`; Android → `ellipsis-vertical` then `square-plus`; generic CTA → `download`.

### 2.6 Accessibility mechanics
- Decorative glyph next to a text label: `aria-hidden="true" focusable="false"`.
- Icon-only control: label the **button** with `aria-label`, keep the SVG `aria-hidden`.
- Status icons never stand alone — always glyph + label + color.
- Illustrations (empty/error/success at 40px) are **self-authored monoline SVG**, 1.75–2px stroke, rounded caps, two-tone `--brand` + `--appetite`, on a soft surface — Lucide-consistent, in-repo (no unlicensed third-party art).

### 2.7 Build-time contrast gate
Ship a tiny relative-luminance script that re-checks, on every token edit: (a) all status text ≥4.5:1 on its fill; (b) all status borders ≥3:1 vs the actual surface; (c) every status icon `currentColor` ≥3:1 in both themes. Amber/orange strokes on white are the usual failure points — fail the build if any regress.

---

## 3. Principle application table

| Principle | Concrete rule (numbers) | How SafeBite applies it (screen / component) |
|---|---|---|
| **Thumb Zone** | Primary action in bottom third; 16px side margins; sit above `env(safe-area-inset-bottom)`. ~49% one-handed, ~75% thumb touches. | Every screen's single CTA ("Check this dish", "Show my card") is a full-width bottom-anchored button; destructive actions live in top corners. |
| **Touch Target** | `--tap-min: 48px` min-height/width (≥ Apple 44pt, = Material 48dp); WCAG floor 24px. Glyph stays 20–24px, hit area padded to 48px. | All buttons, nav items, chips, allergen toggles, close icons; icon-only controls use `::before` overlay to 48px. |
| **Haptic** | Second signal only (visual primary). Light impact on CTA commit; selection tick per allergen chip; success on scan-complete/phrase-saved; warning on "Ask First"/"Risky"; error on "Avoid"/failed scan. Never on scroll; respect OS setting. | Escalates with the status ladder on the Dish Result reveal; save-phrase toast. |
| **Gestural** | Every gesture has a visible button twin. Pull-to-refresh threshold ~64px; swipe-to-save shows a peeking colored edge; native edge-back. Never hide allergen-critical actions behind gesture only. | Restaurant/saved-dish lists; "Why this rating" is a tappable row, not a hidden swipe. |
| **Visual Hierarchy** | One primary action/screen; status verdict is the largest element on the result card; source line is `--font-body-s` `--muted`. | Dish Result: big status chip + one-line reason first; provenance + breakdown demoted. |
| **Negative Space** | ≥24px clear above CTA; ≤8px within a group, ≥24px between groups; ~40–55% of each card is breathing room; whitespace groups, not dividers. | Result cards, restaurant cards, onboarding. |
| **Typographic Scaling** | 16px base, ~1.2 minor third (§1.1). Never <14px for actionable text; 12px = legal/timestamps only. System stack. | Status label `--font-title`; allergen names `--font-body`; timestamp `--font-caption`. |
| **Contrast Ratio** | Text ≥4.5:1; large text (≥24px / ≥18.66px bold), icons, borders, focus ring ≥3:1. All 30 status values + brand verified. | Enforced by §1.3 tokens + §2.7 build gate; visible 2px focus ring `--focus-ring`. |
| **Grid** | 8pt grid + 4px half-step; single centered column, `--content-max: 480px`; gutters 16px (20–24px ≥414px); inter-card 12px; card padding 16px. | Whole showcase; scales to tablet/desktop without redesign. |
| **Progressive Disclosure** | Verdict + one-line reason first; ingredient breakdown / cross-contamination / source behind "Why this rating" accordion (300ms). Advanced filters in a sheet with defaults pre-applied. | Dish Result card; Restaurant Filters sheet; onboarding collects allergens first. |
| **3-Click** | Heuristic not law: core jobs ≤2 taps from any top-level screen; never bury a risk result >1 tap; tolerate 5–7 *easy* steps over 1 confusing one. | Scan→result = 2 taps; Find suitable restaurant = 2 taps. |
| **Bottom Nav** | 3–5 items (SafeBite: Scan · Explore · Phrasebook · Profile = 4); icon 24px above 12/16 label, both always visible; active = filled container + `--brand`; item ≥48px; bar 56px + safe-area; hide on deep flows. | Persistent on top-level screens only. |
| **Breadcrumbs** | No classic horizontal breadcrumbs on mobile. 48px back affordance (chevron + context label e.g. "‹ Pho Hanoi") + clear title; truncated "parent › current" only if depth >2. | Every non-root screen top bar. |
| **Onboarding** | ≤3 screens to value: (1) honest "risk reduction, not elimination" promise, (2) pick allergens (searchable chips), (3) language EN/VI default from locale. 3-dot progress; only allergen step required; no account; land on Scan. | First-run flow. |
| **Gestalt** | Group by spacing (8px in / 24px between); all five status pills identical shape/size so only icon+color+label vary; same icon everywhere a status appears. | Status ladder legend, list rows, result card, toast. |
| **Cognitive Load** | Recognition over recall: saved allergens shown as persistent chips; plain one-line copy; defer detail via disclosure. | Scan/filter screens show the user's allergens as chips, no recall of filter state. |
| **Hick's Law** | One primary action/screen; bottom nav ≤5; filter chips ≤6 then "More"; allergen quick-picks ≤8 then search; multi-step profile setup. | Filters sheet; allergen picker. |
| **Fitts's Law** | Primary CTA biggest + closest: full-width (edge = infinite width), bottom-anchored; destructive smaller + far (top corner); enlarge most-used status filter. | Scan FAB `--icon-28`; full-width result CTA. |
| **Mental Models** | Reuse conventions: risk ladder = traffic/severity scale (green→red); restaurant list = map-app cards; phrasebook = chat/translation card. | Across app; "Ask First" bubble icon reinforces "talk to staff." |
| **Skeleton** | Skeletons not spinners for known layouts; shape-match final; shimmer sweep 1200–1500ms; `--skeleton-delay: 200ms` to avoid flash; >10s or fail → error+Retry; reduced-motion → static placeholders. | Dish-guide load, restaurant list, scan result. |
| **Empty State** | Neutral 48–64px monoline glyph + one plain line + one primary action; never blank; never alarmist. | "No suitable spots within your filters" → "Broaden search"; empty phrasebook → "Browse phrases". |
| **Error State** | What + why (plain) + recovery. Offline: inline banner "You're offline — showing saved results" + Retry (don't block if cache exists). Field errors inline, icon+text (never color alone), re-validate on fix. Never blame user; never use forbidden "safe" copy. | Scan failure "Couldn't read the menu photo" → "Retake photo"; network banner. |
| **Success State** | Bottom toast above nav/safe-area, checkmark + short text; auto-dismiss `--toast-duration: 4000ms` for actionless; **persist** if it carries "Undo" or a screen reader is active. Success haptic on meaningful commits only. | "Phrase saved" · "Card ready" · "Scan complete". |
| **Micro-interactions** | Tap feedback 100ms; control transitions 200ms; sheet/dialog enter 300ms `--ease-emph-decel`, exit 250ms `--ease-emph-accel`; fades `--ease-standard`. Reduced-motion → drop translate/scale/shimmer, keep ≤100ms opacity. | Accordion, sheet, toast, button press. |
| **Platform Specificity** | `viewport-fit=cover`; `env()` safe-area insets; iOS/Android install tips differ (§2.5); iOS body 16px inputs to block auto-zoom; both light/dark honored. | PWA install prompts; bottom bar; inputs. |
| **Responsive / Adaptive** | Single mobile column; center + cap at 480px on larger screens; gutters bump ≥414px; nav hides on deep flows. | All screens; showcase never stretches to unreadable line length. |
| **Dark Mode** | Elevation = lighter surface + `--hairline-top`; canvas `#0a0f1a` not pure black; `data-theme` overrides `prefers-color-scheme`; all status text AAA in dark. | §1.2 + §1.3; theme toggle stamps root. |
| **Accessibility** | WCAG 2.2: 1.4.3 (4.5:1), 1.4.11 (3:1 non-text), 1.4.1 (color never sole signal), 2.5.8 (≥24px targets), reduced-motion, visible focus ring, `aria-hidden` on decorative glyphs, label the control not the SVG. | Status = icon+label+color; §2.7 gate; grayscale + deuteranopia/protanopia acceptance test. |
| **Input Masking** | Format-as-you-type but store raw value; never block valid paste; show format as helper/placeholder; `inputmode` for numeric keypad; inputs ≥16px (no iOS zoom). | Phone on chef-card contact; date fields. |
| **Autofill / Autocomplete** | Correct tokens: `autocomplete="name/email/tel/country-name/one-time-code"`, `type=email/tel`, `inputmode`, `enterkeyhint`. Never `autocomplete="off"` on personal fields (WCAG 1.3.5). | Profile/contact input screen. |
| **Inline Validation** | Keystroke = help only (masks, async availability debounce 300–500ms); blur = correctness feedback, only if edited; submit = final net. After an error shows, switch that field to keystroke so it clears on fix. Don't error untouched tabbed-through fields. | Allergen-profile / contact form. |
| **Smart Defaults** | Language = device locale (EN/VI) one-tap switch; pre-select saved allergens on every scan/filter; restaurant search defaults "near me" moderate radius; **resolve missing data toward Unknown/Ask First, never Suitable**; remember last filters. | Scan, Filters, Onboarding. |

---

## 4. New screens / components to add to the showcase

Each demonstrates one or more principle groups. All self-contained (inline SVG, CSS backgrounds, system fonts).

**4.1 Skeleton — Dish Guide loading**
Shape-matched placeholders: a 64%-width title bar, a pill-shaped status-chip placeholder (`--r-full`), three 100%/85%/70% text lines, a 16:9 image block (`--r-lg`). Neutral `--surface-2` fills; single left-to-right shimmer via `--dur-shimmer` (opacity+position). Appears only after `--skeleton-delay: 200ms`. Reduced-motion → static, no shimmer. If load fails/>10s → swap to 4.3. Proves: Skeleton, Micro-interactions, Cognitive Load, Dark Mode.

**4.2 Empty state — no matching restaurants**
Centered 56px self-authored monoline glyph (fork + magnifier, two-tone brand/coral on `--brand-soft`), `--font-title` line "No suitable spots within your filters", `--font-body-s` `--muted` subline, one full-width bottom CTA "Broaden search". No dividers, ~50% whitespace. Proves: Empty State, Fitts's, Negative Space, Hick's.

**4.3 Error + retry — scan failure / offline**
Two variants. (a) Scan failed: 40px `camera` glyph in a soft `--surface-2` circle, "Couldn't read the menu photo — try better lighting", primary "Retake photo" + secondary "Enter dish name". (b) Offline banner (non-blocking, top of list): `wifi-off` + "You're offline — showing saved results" + inline "Retry", cached list still visible below. Icon+text, blame-free, no "safe" copy. Proves: Error State, Platform Specificity, Mental Models.

**4.4 Success toast**
Bottom-anchored above nav + safe-area, `--e3`, `--r-md`, `circle-check` + "Phrase saved". Slides up 200ms `--ease-emph-decel`, auto-dismiss 4000ms. Variant with "Undo" does **not** auto-dismiss and stays until acted on / screen-reader-safe. Fires success haptic. Proves: Success State, Haptic, Micro-interactions.

**4.5 Input screen — autocomplete + inline validation + smart defaults**
Chef-card contact form. Fields: Name (`autocomplete="name"`), Email (`type=email autocomplete="email" inputmode=email`), Phone (`type=tel autocomplete="tel" inputmode=tel`, masked-but-stores-raw), Language (pre-selected from locale, one-tap EN/VI toggle), Allergens (saved ones pre-checked chips). Validation: help on keystroke, correctness on blur, error clears on keystroke after shown, inline below field with warning icon+text. All inputs ≥16px. Includes the **hue-neutral confidence meter** demo (3 grayscale segments + word) to show it is NOT a status color. Proves: Autofill, Inline Validation, Input Masking, Smart Defaults, Accessibility, Cognitive Load.

**4.6 Thumb-zone annotated phone**
A phone frame (`--r-xl` inner) with three tinted reach arcs — green (bottom third, easy), amber (mid), red (top corners, hard) — overlaid with callouts: primary CTA in green zone, back/close in top-left, destructive in top-right, bottom nav within green. Labels cite ~49% one-handed / ~75% thumb and 48px targets. Proves: Thumb Zone, Fitts's, Touch Target, Physical Interaction.

**4.7 "States & motion" spec panel**
A reference card listing, with live swatches/animations: durations (100/200/300/250ms), easing curves (`--ease-standard`, `--ease-emph-decel`, `--ease-emph-accel`), the four elevation levels (`--e1`–`--e4`), the six radii, the haptic-to-status escalation table, and a `prefers-reduced-motion` before/after toggle showing translate/scale/shimmer collapsing to ≤100ms opacity. Proves: Micro-interactions, Dark Mode, Accessibility, State system coherence.

---

## 5. Concrete change list vs the current HTML

**Backgrounds**
1. Replace the current flat dark canvas `#070b14` with token `--bg` (`#0a0f1a` dark / `#eceff4` light).
2. Add `--hero-bg` layered mesh gradient to hero/headers (warm coral blob confined to top-right corner only); body/list surfaces stay flat.
3. Add the `--noise` feTurbulence grain `::after` on hero/brand surfaces only (`.04` soft-light light / `.06` overlay dark, `pointer-events:none`); kills 8-bit banding. Body surfaces get no grain.
4. Any food photo gets the `--photo-scrim` bottom gradient so the status chip + name stay AA-legible; the photo is never the safety cue.
5. Build the full 4-level surface ladder (`--surface`/`-2`/`-3`/`--overlay`); in dark, express elevation with lighter surfaces + `--hairline-top`, not heavier shadow.

**Buttons — full state set (add all states, all variants)**
6. Define Primary (blue, `--brand`), Secondary (coral **tinted surface** `--appetite-soft` with `--appetite-ink` label — never white-on-coral text), and Tertiary/ghost. Each with the complete set: **default → hover → active/pressed (100ms) → focus-visible (`--focus-ring`, ≥3:1) → disabled (reduced opacity + not-allowed) → loading (inline spinner/skeleton, label persists)**.
7. Enforce `min-height:48px`, `--r-sm` (12px), 16px horizontal padding; primary CTA full-width bottom-anchored above `--safe-bottom`.
8. Coral CTAs are secondary only; the primary "Check this dish" stays blue.

**Icon swap**
9. Replace any existing icon set with **inlined Lucide** (24×24, stroke 2, `currentColor`); paste ISC + Feather-MIT notices verbatim at build time.
10. Apply the two renames wherever referenced: `message-circle-question` → `message-circle-question-mark`; `circle-help` → `circle-question-mark`.
11. Map the five status glyphs exactly per §1.3 / §2.5; **remove any `shield-check`/check-badge** used for dish safety (implies forbidden "verified safe") — use plain `shield` and reserve bare `check` for neutral confirmations.
12. Every status renders icon **+** label **+** color; every allergen glyph carries its text label.

**Accent / color**
13. Replace the current orange accent `#f97316` (same hue as the "Risky" status — misreads as an alert) with the appetite coral `--appetite #ef6851` / dark `#ff7a66`, governed by the fill-only usage rules; never inside assessment UI.
14. Swap the status colors to the verified §1.3 set (30 values); confidence meter becomes hue-neutral, not ladder-hued.
15. Restrict brand-blue text: `--brand #0b6bd6` only for ≥14px normal-weight text on light; dense/small brand text uses `--brand-ink #0a4da0`; never Facebook `#1877F2` or `#5aa2ff` as text on white; `#5aa2ff` for dark surfaces only.

**Spacing**
16. Migrate all ad-hoc margins/paddings to the 8pt scale (`--space-0`…`-7`); 16px default gutter, 12px inter-card, 24px+ between sections, ≥24px above every CTA, ≤8px within groups.
17. Add safe-area insets (`viewport-fit=cover` + `env()`), 56px bottom-nav content height + inset, center content at `--content-max: 480px`.

**Type**
18. Replace the current type sizes with the modular scale (§1.1); base 16px, never <14px for actionable text, 12px only for legal/timestamps.
19. Confirm the system font stack (no web-font requests); status label at `--font-title`, nav labels `--font-label`.

**Radius & elevation**
20. Replace the current single `--r` (16px) and two-level shadow with the 6-step radius ramp and the 4-level `--e1`–`--e4` shadow scale; status chips → `--r-full`, cards → `--r-md`, sheets → `--r-xl`; apply inner = outer − padding for nested corners.

**Motion & a11y**
21. Adopt the motion tokens (durations + easing) and add a global `@media (prefers-reduced-motion: reduce)` that drops translate/scale/shimmer to ≤100ms opacity fades.
22. Add the visible 2px focus ring, `aria-hidden` on decorative glyphs, `aria-label` on icon-only buttons, and wire the §2.7 build-time contrast gate + grayscale/deuteranopia/protanopia acceptance test into the showcase.