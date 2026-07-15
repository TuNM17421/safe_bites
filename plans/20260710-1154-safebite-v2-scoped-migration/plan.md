# SafeBite v2 (scoped) — Migration Plan

**Goal:** Migrate the current v1-era app to the scoped **v2** design
(`docs/design/safebite-ui-ux-mockups-v2.html`). v2 trims features to the core
business flows and adds four greenfield surfaces. This is a **re-scoping, not a
rewrite** — the existing traffic-light / recommendation / feedback / offline /
i18n / admin-CRUD infrastructure is reused heavily.

**Guiding principle (unchanged):** *App only SUGGESTS — a human must confirm
(human-in-the-loop).* Bilingual VI/EN. Same design system (ocean-blue, Lucide,
traffic-light + compatibility %-ring, color-blind-safe, light/dark).

- Study / delta reference: [`migration-delta.md`](./migration-delta.md)
- Inventory research: [`research/current-state-inventory.md`](./research/current-state-inventory.md)
- Source mockups: `docs/design/safebite-ui-ux-mockups.html` (v1) → `…-v2.html` (v2)

## Three bands
1. **Structural (cheap, decision-free)** — nav 4→5 tabs, route renames, merges,
   removals, onboarding trim. Reuses components almost verbatim; ship first.
2. **Data-model foundation** — one Prisma migration unblocking map, dish
   provenance, famous, and reports.
3. **Net-new (greenfield, mock-first)** — map home, dish provenance, famous,
   reports UI, Excel import, OCR, chat agent, biometric login.

## Decisions locked (2026-07-10)
- **Greenfield strategy:** mock-first for `/login`, `/agent`, `/ocr` (simulated biometric, scripted agent, stub OCR); real providers swap in behind stable interfaces later.
- **Map stack:** **Leaflet** (raster tiles) for `/home` and admin restaurants — replaces the MapLibre suggestion in phase 06/10.

## Phases
| # | Phase | Effort | Risk | Depends | Status |
|---|-------|:-----:|:----:|---------|--------|
| 01 | [Nav + shell restructure (5 tabs)](./phase-01-nav-shell-restructure.md) | M | med | — | ✅ Done |
| 02 | [Route rename, link sweep, removals](./phase-02-route-rename-and-removals.md) | M | med | 01 | ✅ Done |
| 03 | [Merge allergy-card into Profile](./phase-03-merge-allergy-card-into-profile.md) | M | low | 02 | ✅ Done |
| 04 | [Trim onboarding to 2 steps](./phase-04-trim-onboarding-two-steps.md) | S | med | 01 | ✅ Done |
| 05 | [Data-model foundation](./phase-05-data-model-foundation.md) | L | high | 02 | ✅ Done |
| 06 | [Map-first /home (Leaflet)](./phase-06-map-first-home.md) | L | high | 05 | ✅ Done |
| 07 | [Restaurant detail % ring + dish provenance](./phase-07-restaurant-detail-and-dish-provenance.md) | L | med | 05 | ✅ Done |
| 08 | [/famous curated dishes](./phase-08-famous-dishes.md) | M | low | 05 | ✅ Done |
| 09 | [Ingredient reports + /admin/reports](./phase-09-ingredient-reports-and-admin-reports.md) | L | med | 05, 07 | ✅ Done |
| 10 | [Admin restaurants map+list + 4-item sidebar](./phase-10-admin-restaurants-map-list.md) | M | low | 05 | ✅ Done |
| 11 | [Admin Excel/CSV import UI](./phase-11-admin-excel-import.md) | M | med | 10 | ✅ Done |
| 12 | [/ocr scanner + /admin/ocr-review (mock vision)](./phase-12-ocr-scanner-and-review.md) | XL | high | 05, 10 | ✅ Done |
| 13 | [/agent chat assistant (scripted)](./phase-13-agent-chat-assistant.md) | L | high | 06, 09 | ✅ Done |
| 14 | [Biometric /login (simulated) + encryption](./phase-14-biometric-login.md) | L | high | 04 | ⬜ Not started |

## Sequencing
`01→02→{03, 04}` first (structural). Then **05 is the linchpin** (one migration).
After 05 three tracks parallelize: `06→07`, `08`, `10→11`. Reports `09` needs
05 + 07. Greenfield trio `12/13/14` is last and each ships behind a **mock**
(stub OCR, scripted agent, simulated biometric) so nothing blocks on an external
provider or WebAuthn support; real adapters swap in behind stable interfaces.

## Key dependencies / decisions (see `migration-delta.md` §Decisions)
Map stack (MapLibre vs Leaflet) · real-vs-mock for login/agent/ocr · providers
(LLM, vision, tiles) · `defaultLocale` en→vi flip · admin bilingual vs EN-only ·
reporter identity vs anonymity · where severity/cross-contact live post-trim.
