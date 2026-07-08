# Phase 07 — PWA Shell & Offline Baseline

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §10.2 Offline behavior (lines 1222–1241)
  - §11 PWA Requirements — manifest / SW cache table / install education (1244–1304)
  - §12.3 `/home` route (1354–1367)
  - §13 Components + status visual priority + Suitable caveat (1459–1491)
  - §19 P1-01 PWA web shell acceptance (1746–1757)
  - Supporting: §2 fixed decisions (99–116), §9.2 client-config (932–950), §10.1 local-storage rules (1200–1220), §14 copy keys (1494–1527), §16 copy safety guard (1570–1602)
- Related phase files (by plan index):
  - `phase-02-nextjs-app-foundation.md` — **dependency**: App Router + next-intl (`[locale]` routing, `@/i18n/navigation`), Tailwind + semantic tokens, root layout, `middleware.ts`, `messages/{en,vi}.json`, landing `/`.
  - `phase-06-api-skeleton.md` — provides `GET /api/v1/client-config` consumed by `/home`.
  - `phase-08-indexeddb-client-storage.md` (Dexie, P1-02) — later phase that fills the offline *content* (profile summary, allergy card, saved dishes). This phase only ships the offline *shell*; profile-summary read is a soft dependency (graceful "no profile" fallback until then).
  - `phase-09-onboarding.md` / `phase-11-question-card.md` — later phases wire the two extra install-education triggers (onboarding-completed, question-card-generated).
- Seed kit: `osm_overpass_seed_kit/` — **not touched here** (discovery-only OSM data is never surfaced in Phase 1 UX; §1). No restaurant CTA in the shell.

## Overview

- **Priority:** High — first Phase 1 deliverable (P1-01); every subsequent UI phase renders *inside* this shell.
- **Current status:** Not started.
- **Brief description:** Ship the installable PWA skeleton and offline baseline: `manifest.webmanifest`, a Serwist-built service worker implementing the §11.2 cache-strategy table, a zero-dependency `offline.html` fallback plus an in-app `/offline` route, the app-shell chrome (`AppHeader`, `BottomNav`, `OfflineBanner`, `InstallEducationCard`), the `/home` route (§12.3), and non-blocking install-education gating (§11.3). Network-first HTML with offline fallback; cache-first app shell; the recommendation API is never blindly cached.

## Key Insights

- **next-intl reshapes every path.** Routes live under `apps/web/src/app/[locale]/…`. `/home` is `[locale]/(app)/home/page.tsx`; the shell layout is the `(app)` group layout. All in-app links use `@/i18n/navigation` (`Link`, `usePathname`), **never** `next/link` — critical for `BottomNav` active state and locale preservation.
- **Two offline fallbacks, on purpose.** `public/offline.html` is a static, self-contained, locale-agnostic, zero-JS page — the SW navigation fallback that works even before the app shell hydrates. `[locale]/offline/page.tsx` is the richer in-app route reached when the shell *is* loaded. Do not collapse them into one.
- **Manifest & static assets bypass next-intl.** `/sw.js`, `/manifest.webmanifest`, `/offline.html`, `/icons/*.png` all contain a `.` and are excluded by next-intl's default matcher `['/((?!api|_next|.*\\..*).*)']`. Verify the matcher; do not let the locale middleware rewrite these.
- **`offline.html` sits OUTSIDE the copy-safety guard's scan roots.** §16 scans `apps/web/src`, `packages/domain/src`, `apps/web/prisma` — **not** `apps/web/public`. `offline.html` contains user-facing safety copy. Mitigation in this phase: extend `scripts/assert-no-unsafe-copy.ts` scan globs to include `apps/web/public/**/*.html` (and `**/*.webmanifest`) so the fallback page can't smuggle forbidden wording.
- **Recommendation API must be excluded explicitly.** `POST /api/v1/recommendations/dishes` is POST (Workbox/Serwist won't cache POST by default) — but state it as `NetworkOnly` anyway so no future change accidentally caches a personalized risk result. Same for `/question-cards` and all `/admin` routes. Unknown risk must never be served stale as if fresh (§0, §8 conservative-unknown intent).
- **Install education is an OR-gate and must never block first paint (§11.3).** The self-contained trigger available in *this* phase is **second session** (a localStorage session counter). The other two triggers (onboarding-completed, question-card-generated) are wired by later phases writing a UI-pref flag; design `useInstallPrompt` to read a pluggable set of flags so those phases only flip a boolean.
- **Raw-hex exception is narrow.** `manifest.webmanifest` (`background_color`, `theme_color`) and `offline.html` inline critical CSS legitimately use raw hex — they are static config/zero-dependency assets, not React components, so the "semantic tokens only in components" standing rule does not reach them. Every *component* in this phase (`AppHeader`, `BottomNav`, `OfflineBanner`, `InstallEducationCard`, `/home`) uses semantic Tailwind tokens only.
- **`pwaInstallEnabled` is a kill switch.** `/home` and install-education read `pwaInstallEnabled` from `GET /api/v1/client-config` (§9.2); when false, suppress the install card entirely.

## Requirements

### Functional
- Serve `public/manifest.webmanifest` with the exact §11.1 fields; app is installable (passes Lighthouse "installable" criteria).
- Register a service worker (Serwist) implementing the §11.2 strategy table:
  - App shell / static assets → **Cache first**.
  - HTML navigation → **Network first**, fallback `/offline.html`.
  - Public GET config/templates/dishes (`/api/v1/client-config|profile-templates|allergens|dishes`) → **Network first, short cache** (TTL mirrors `offlineCacheTtlDays` = 7d).
  - Recommendation / question-card / admin APIs → **Never cached** (`NetworkOnly`).
  - Private/local profile → IndexedDB only (out of SW scope).
- App shell reloads offline after the first visit (§10.2 line 1227).
- `AppHeader`, `BottomNav`, `OfflineBanner`, `InstallEducationCard` implemented (§13) and wired into the `(app)` shell layout.
- `OfflineBanner` shows the §10.2 offline copy (with "confirm with restaurant staff before ordering") whenever `navigator.onLine === false`.
- `/home` (§12.3) shows: active-profile summary (or onboarding link if none), destination city, CTAs *Browse local dishes* / *Show allergy card* / *Generate question card*, an offline indicator, and a disabled "restaurant search — Coming later" affordance.
- `/offline` in-app route renders the offline notice + CTAs to still-available offline content (allergy card / last question card).
- Install education appears only after ≥1 of {onboarding completed, question card generated, second session} (§11.3) and never on first visit; dismissible.

### Non-functional
- No forbidden copy anywhere, including `offline.html` and the manifest description (§0, §16). Passes `pnpm check:copy`.
- `pnpm typecheck` and `pnpm lint` pass; each new impl file < ~200 lines.
- Every component file uses semantic color tokens only (raw hex only in `manifest.webmanifest` / `offline.html`).
- Install UI must not delay or block first contentful paint or any core flow (§11.3 line 1302).
- Offline fallback must work with zero network and zero JS execution (static `offline.html`).
- Bilingual chrome via `useTranslations()`; new keys added to `messages/{en,vi}.json`. Locale-agnostic `offline.html` shows both EN + VI lines (can't run next-intl).

## Architecture

**System design.** Serwist (`@serwist/next`) compiles `src/lib/service-worker.ts` (swSrc, per §3) into `public/sw.js` at build; `next.config.ts` wraps the config with `withSerwist`. The SW precaches Next build assets + `/offline.html`, then applies runtime strategies per the table. The root `[locale]/layout.tsx` declares `metadata.manifest` + `themeColor` and registers the SW. The `(app)` route-group layout is the persistent shell (header + content slot + bottom nav + offline banner + install card).

**Component interactions.**
```
[locale]/layout.tsx  (metadata.manifest, themeColor, <SwRegister/>)
  └─ [locale]/(app)/layout.tsx  = APP SHELL
       ├─ <AppHeader/>            (title + <LanguageToggle/> slot)
       ├─ <OfflineBanner/>        ← useOnlineStatus()
       ├─ {children}             ← /home, /dishes, /allergy-card, …
       ├─ <InstallEducationCard/> ← useInstallPrompt() + client-config.pwaInstallEnabled
       └─ <BottomNav/>            (@/i18n/navigation Link + usePathname)
[locale]/offline/page.tsx        (outside (app) group; minimal, shell-independent)
public/offline.html              (SW navigation fallback; static, no next-intl)
```

**Data flow.**
- Online status: `useOnlineStatus` subscribes to `window` `online`/`offline` events → drives `OfflineBanner` + `/home` indicator (Zustand not required; local hook is enough — KISS).
- Install: `beforeinstallprompt` captured in `useInstallPrompt`, deferred event stored; gate = `pwaInstallEnabled && (secondSession || onboardingDone || questionCardMade) && !dismissed`; dismissal + session count in localStorage UI-prefs (`sbt_ui_prefs`), which §10.1 explicitly permits for UI preferences.
- `/home`: TanStack Query → `GET /api/v1/client-config` for `defaultCity`/`supportedCities` + `pwaInstallEnabled`; profile summary from the Dexie repo when available (phase-08), else "No profile yet → /onboarding".

## Related Code Files

### To create
- `apps/web/public/manifest.webmanifest` — exact §11.1 JSON.
- `apps/web/public/offline.html` — static zero-JS fallback, EN+VI safety copy, inline CSS.
- `apps/web/public/icons/icon-192.png`, `apps/web/public/icons/icon-512.png` — placeholder maskable-safe icons (theme-color bg + "SB" mark).
- `apps/web/src/lib/service-worker.ts` — Serwist swSrc: precache + `/offline.html` fallback + runtime strategy list (§11.2).
- `apps/web/src/lib/sw-register.tsx` — tiny `'use client'` component to register `/sw.js` (if not auto-registered by the plugin).
- `apps/web/src/lib/ui-prefs.ts` — localStorage helpers: `getSessionCount()/bumpSession()`, `isInstallCardDismissed()/dismissInstallCard()`, install-trigger flags.
- `apps/web/src/components/app-shell/app-header.tsx` — `AppHeader`.
- `apps/web/src/components/app-shell/bottom-nav.tsx` — `BottomNav` (uses `@/i18n/navigation`).
- `apps/web/src/components/app-shell/offline-banner.tsx` — `OfflineBanner`.
- `apps/web/src/components/app-shell/install-education-card.tsx` — `InstallEducationCard`.
- `apps/web/src/components/app-shell/use-online-status.ts` — hook.
- `apps/web/src/components/app-shell/use-install-prompt.ts` — hook (beforeinstallprompt + gating).
- `apps/web/src/app/[locale]/(app)/home/page.tsx` — `/home` (§12.3).
- `apps/web/src/app/[locale]/offline/page.tsx` — in-app `/offline` route.

### To modify
- `apps/web/next.config.ts` — wrap with `withSerwist({ swSrc: 'src/lib/service-worker.ts', swDest: 'public/sw.js', register: true, disable: dev })`.
- `apps/web/src/app/[locale]/layout.tsx` — add `metadata.manifest = '/manifest.webmanifest'`, `viewport.themeColor`, apple-touch icon; mount `<SwRegister/>`.
- `apps/web/src/app/[locale]/(app)/layout.tsx` — compose the shell (header + banner + children + install card + bottom nav). (Created minimal in phase-02; enriched here.)
- `apps/web/messages/en.json`, `apps/web/messages/vi.json` — add `nav.*`, `offline.*`, `install.*`, `home.*` keys (reuse §14 `offlineNotice`, `safetyDisclaimer`).
- `apps/web/middleware.ts` — verify next-intl matcher excludes `/sw.js`, `/manifest.webmanifest`, `/offline.html`, `/icons/*`, `/api` (adjust only if it doesn't).
- `apps/web/scripts/assert-no-unsafe-copy.ts` — extend scan globs to include `apps/web/public/**/*.{html,webmanifest}` (closes the offline.html gap).
- `apps/web/package.json` — add `@serwist/next` + `serwist` deps; `check:copy` already wired in phase covering §16.

### To delete
- None.

## Implementation Steps

1. **Manifest.** Create `public/manifest.webmanifest` verbatim from §11.1. In `[locale]/layout.tsx` set `export const metadata.manifest = '/manifest.webmanifest'` and `export const viewport = { themeColor: '#0f172a' }`; add apple-touch-icon link.
2. **Placeholder icons.** Generate `icon-192.png` / `icon-512.png` (theme-color background + "SB" glyph) via ImageMagick (`imagemagick` skill) or a design tool; commit under `public/icons/`. Ensure ≥512 for maskable.
3. **Serwist install + config.** Add `@serwist/next` + `serwist`; wrap `next.config.ts` with `withSerwist` (swSrc `src/lib/service-worker.ts`, output `public/sw.js`, `disable` in dev to keep HMR sane).
4. **Service worker source** (`src/lib/service-worker.ts`): install Serwist with `precacheEntries` (build manifest) + additional `'/offline.html'`; register runtime caching in strategy order:
   - `NavigationRoute` → `NetworkFirst`, on failure serve precached `/offline.html` (`PrecacheFallbackPlugin` / catch handler).
   - static (`/_next/static/**`, images, fonts) → `CacheFirst` + expiration.
   - GET `/api/v1/(client-config|profile-templates|allergens|dishes)` → `NetworkFirst`, `maxAgeSeconds` = 7d, small `maxEntries`.
   - `NetworkOnly` fallthrough for `POST`, `/api/v1/recommendations/*`, `/api/v1/question-cards`, `/api/v1/admin/*`.
5. **SW registration.** Add `sw-register.tsx` (`'use client'`, registers `/sw.js` in `useEffect` guarded by `'serviceWorker' in navigator`) and mount it in `[locale]/layout.tsx` — unless `withSerwist({register:true})` auto-injects, in which case skip the component (KISS).
6. **Static offline fallback** (`public/offline.html`): standalone HTML, inline critical CSS, EN + VI offline copy (§10.2), the "confirm with restaurant staff before ordering" reminder, and a plain `<a href="/home">` retry link. No `<script>`, no external assets. No forbidden phrases.
7. **Online-status hook** (`use-online-status.ts`): SSR-safe (`useState(() => navigator?.onLine ?? true)`), subscribe/cleanup `online`/`offline` events.
8. **UI-prefs helper** (`ui-prefs.ts`): localStorage-backed session counter (bump once per session load) + install-card dismissal + trigger flags; all try/catch guarded (private-mode safe).
9. **Install-prompt hook** (`use-install-prompt.ts`): capture `beforeinstallprompt`, expose `{ canPrompt, promptInstall, shouldShowEducation, dismiss }`; gate = `pwaInstallEnabled && (secondSession || onboardingDone || questionCardMade) && !dismissed`.
10. **App-shell components:** `AppHeader` (title + language-toggle slot), `BottomNav` (Home / Dishes / Allergy card / Question card / Profile using `@/i18n/navigation` `Link` + `usePathname` for active state; **no** Restaurants tab), `OfflineBanner` (renders when offline, `role="status"`, offline copy), `InstallEducationCard` (renders only when `shouldShowEducation`, "Add to Home Screen" education + Install/Dismiss, non-blocking). Semantic tokens only.
11. **`(app)` shell layout:** compose header + `OfflineBanner` + `{children}` + `InstallEducationCard` + `BottomNav`; mobile-first, `max-w` centered.
12. **`/home` page** (§12.3): profile summary slot (Dexie repo when present, else onboarding link), destination city + CTAs via TanStack Query on `client-config`, offline indicator, disabled "restaurant search — Coming later". No forbidden copy; include `SafetyNotice`/caveat slot per §13.
13. **In-app `/offline` route:** minimal offline notice + CTAs to allergy card / last question card; sits outside the `(app)` group so it renders without shell data.
14. **i18n keys:** add `nav.*`, `offline.*`, `install.*`, `home.*` to `messages/{en,vi}.json`; reuse §14 `offlineNotice` / `safetyDisclaimer` wording.
15. **Extend copy guard:** update `assert-no-unsafe-copy.ts` scan globs to include `apps/web/public/**/*.{html,webmanifest}`; run `pnpm check:copy`.
16. **Verify:** `pnpm typecheck && pnpm lint && pnpm check:copy`; production build; DevTools → Application: manifest valid, SW active, offline reload serves `offline.html`, install education absent on first visit and present on second session.

## Todo List

- [ ] `public/manifest.webmanifest` created (exact §11.1) and linked via layout metadata + themeColor.
- [ ] Placeholder `icon-192.png` / `icon-512.png` committed.
- [ ] `@serwist/next` added; `next.config.ts` wrapped with `withSerwist` (dev-disabled).
- [ ] `src/lib/service-worker.ts` implements the full §11.2 strategy table incl. `NetworkOnly` for recommendation/question-card/admin.
- [ ] SW registered (`sw-register.tsx` or plugin auto-register) and active in build.
- [ ] `public/offline.html` static fallback (EN+VI, safety reminder, no JS, no forbidden copy).
- [ ] `use-online-status.ts` hook (SSR-safe).
- [ ] `ui-prefs.ts` localStorage helper (session count + install dismissal + triggers).
- [ ] `use-install-prompt.ts` gating hook honoring `pwaInstallEnabled`.
- [ ] `AppHeader`, `BottomNav`, `OfflineBanner`, `InstallEducationCard` (semantic tokens, `@/i18n/navigation`).
- [ ] `(app)` shell layout composed.
- [ ] `/home` page per §12.3 (CTAs, city, offline indicator, "Coming later" restaurant CTA).
- [ ] `/offline` in-app route.
- [ ] `messages/{en,vi}.json` chrome keys added.
- [ ] `assert-no-unsafe-copy.ts` extended to scan `public/**/*.{html,webmanifest}`.
- [ ] `middleware.ts` matcher verified to exclude sw/manifest/offline/icons/api.
- [ ] typecheck + lint + copy-guard + offline-reload manual check all pass.

## Success Criteria

Mirrors §19 P1-01 acceptance (lines 1752–1757):
- **Manifest is served** — `GET /manifest.webmanifest` returns valid JSON; DevTools shows an installable manifest with both icons.
- **App has mobile bottom navigation** — `BottomNav` renders on every `(app)` route, preserves locale, marks the active tab; no restaurant tab.
- **Offline fallback page exists** — with the SW active, going offline and reloading a navigation serves `/offline.html`; app shell reloads after first visit (§10.2 line 1227).
- **Install education does not block first visit** — no install UI on first load; appears only on a qualifying trigger (second session verified), and is dismissible.
- Additional: `OfflineBanner` shows §10.2 copy when offline; `/home` shows all §12.3 elements; recommendation API is never cached by the SW; `pnpm check:copy` passes including `offline.html`; typecheck + lint green.
- **Validate:** production build, DevTools Application panel (Manifest + Service Workers + Cache Storage), Network "Offline" throttling reload, and a scripted second-session check for install education.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| next-intl middleware rewrites `/sw.js` / `/offline.html` / `/manifest.webmanifest` | SW never registers; fallback 404s | Dotted paths already excluded by default matcher; explicitly verify and add negative lookaheads if custom matcher used. |
| SW caches a personalized recommendation result | Stale/incorrect risk shown as fresh — safety regression (§0) | Explicit `NetworkOnly` for `/recommendations`, `/question-cards`, `/admin`; POST excluded by default; assert in review. |
| `offline.html` bypasses copy guard | Forbidden "safe" wording ships unchecked | Extend guard globs to `public/**/*.{html,webmanifest}` (Step 15) before merge. |
| SW dev-mode caching breaks HMR / stale bundles | Broken local dev, confusing bugs | `disable: process.env.NODE_ENV === 'development'` in `withSerwist`. |
| Install-education gating reads Dexie before phase-08 lands | Runtime error / hard coupling | Base trigger = localStorage second-session (self-contained); onboarding/question-card triggers are optional flags read defensively. |
| First-ever visit offline | Nothing cached → blank | Expected per §10.2 (line 1227); document as known limitation, not a bug. |
| Locale-prefixed `/offline` redirect while offline | Fallback loop | SW fallback targets the **static** `/offline.html` (locale-agnostic), not the `[locale]/offline` route. |
| Icons missing/too small | Manifest "installable" check fails | Provide 192 + 512 placeholders; 512 maskable-safe padding. |

## Security Considerations

- **Safety copy (non-negotiable, §0/§16):** `offline.html`, manifest `description`/`name`, and all shell components must avoid the forbidden phrases ("Guaranteed Safe", "100% Safe", "Allergy-proof", "This dish is safe", "verified_safe"). The copy guard's scan roots are extended to cover `public/` in this phase. `OfflineBanner` and `offline.html` retain the "confirm with restaurant staff before ordering" reminder; `/home`'s Suitable/recommendation surfaces always carry the caveat.
- **No secrets client-side:** SW and shell store only non-sensitive UI prefs (session count, install-dismissed) in localStorage — permitted by §10.1; **never** the admin token or profile data (§10.2 lines 1216–1218). The `sbt_admin` httpOnly cookie is untouched here.
- **SW scope discipline:** scope `/`; never cache authenticated `/api/v1/admin/*` responses (`NetworkOnly`); never cache POST. Precache only public build assets + `offline.html`.
- **OSM discovery-only (§1):** the shell exposes **no** restaurant surface — `BottomNav` has no Restaurants tab and `/home` shows only a disabled "Coming later" affordance; unverified OSM data stays out of all Phase 1 UX.
- **PWA kill switch:** install education respects `client-config.pwaInstallEnabled`, allowing server-side disablement without a redeploy.

## Next Steps

- **Unblocked by:** `phase-02-nextjs-app-foundation.md` (App Router, next-intl `[locale]` routing + `@/i18n/navigation`, Tailwind tokens, root layout, `middleware.ts`, base `messages/*`), and `phase-06-api-skeleton.md` for `client-config` consumed by `/home`.
- **This phase unblocks:** all in-app UI phases render inside the `(app)` shell — `phase-08` (Dexie storage fills the offline profile summary + saved dishes + last question card the shell/`/offline` link to), `phase-09` onboarding, `phase-10` allergy card, `phase-11` dishes, `phase-12` question card. Those phases plug real offline content into the shell and flip the remaining install-education trigger flags.
- **Follow-ups for later phases:** wire Dexie-backed profile summary into `/home`; set `onboardingDone` / `questionCardMade` UI-pref flags from their flows; add "save selected recommendation to IndexedDB" (§11.2 last row) in the dishes phase.
