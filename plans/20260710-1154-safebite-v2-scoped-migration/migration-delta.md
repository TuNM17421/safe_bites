# SafeBite v1 → v2 — Migration Delta (study output)

Source of truth: `docs/design/safebite-ui-ux-mockups-v2.html` (target) vs the
current implementation (built to `…-mockups.html` v1). This document is the
screen-by-screen delta, the required data-model changes, the removals, and the
open decisions. Phase files break the work into shippable units.

## 0. What v2 changed at a glance
- **Bottom nav 4 → 5 destinations:** ~~Home · Dishes · Restaurants · Profile~~ →
  **Bản đồ (Map) · Trợ lý (Agent) · OCR · Nổi tiếng (Famous) · Hồ sơ (Profile)**.
- **Home becomes map-first** (pins labelled by compatibility %, draggable
  nearby-sheet, allergen search) instead of a CTA hub.
- **Four greenfield surfaces:** `/login` (biometric), `/agent` (chat), `/ocr`
  (dish scan), map-first `/home`.
- **Merges & demotions:** `/allergy-card` → folded into `/profile`;
  `/question-card` → contextual button on dish detail; `/dishes` →
  superseded by map `/home` + `/famous`; `/restaurants` list → the map `/home`;
  elaborate post-meal `/feedback` flow → a lean "report wrong ingredient".
- **Admin** collapses to 4 sidebar items: **Restaurants (map+list) · Import
  Excel · OCR review · Reports**, and gains an actual shell/sidebar (none today).

## 1. Screen-by-screen mapping

| v2 screen | Route | Disposition | Current state | Work |
|-----------|-------|-------------|---------------|------|
| Biometric login | `/[locale]/login` | **NEW** | Absent (only admin token login) | New route outside `(app)`; mock ceremony unlocks Dexie profile; real WebAuthn later |
| Onboarding 1/2 — allergens | `/[locale]/onboarding` | modify | 6-step wizard (`TOTAL=6`) | `TOTAL=2`; keep allergen search+chips |
| Onboarding 2/2 — warning | `/[locale]/onboarding` | reuse | `StepDisclaimer` already writes `safetyAcceptedAt` | Promote to step 2 |
| Map home (Bản đồ) | `/[locale]/(app)/home` | modify (rewrite) | CTA hub; `restaurant-map-shell` = "map coming soon" placeholder; no map lib | Full-bleed MapLibre + bottom sheet + allergen search + CompatRing |
| Assistant (Trợ lý) | `/[locale]/(app)/agent` | **NEW** | Absent | Chat UI + scripted `/api/v1/agent`; Confirm/Edit → ingredient-correction path |
| OCR scanner | `/[locale]/(app)/ocr` | **NEW** | Absent | Camera viewfinder + stub prediction + "general recipe NOT this restaurant" warning |
| Famous (Nổi tiếng) | `/[locale]/(app)/famous` | **NEW** | `/dishes` is a 5-status safety guide, no "famous" concept | Curated famous-dish cards + "N restaurants near you" |
| Profile + bilingual card | `/[locale]/(app)/profile` | **MERGE** | `profile-view` + separate `/allergy-card` | Fold bilingual VI/EN staff card + VI/EN toggle + "edit allergies" |
| Restaurant detail | `/[locale]/(app)/restaurant/[id]` | modify | plural `/restaurants/[…]`; A–E readiness badge; OSM link | Singular route; **% ring** + N-suit/ask/avoid; "Open Google Maps" |
| Dish at restaurant | `/[locale]/(app)/restaurant/[id]/dish` | **NEW** | Ingredients only at Dish level; `MenuItem.ingredientNotes` free-text | Ingredient rows + **provenance** + Add / Report-wrong / Ask-owner |
| Bottom nav | app-shell | modify | 4 tabs, `grid-cols-4` | 5 tabs, `grid-cols-5`, distinct Map icon |
| Admin restaurants | `/admin/restaurants` | modify | list-only, raw enum columns | map+list toggle (`lat/lon`) + provenance badge + ingredient count |
| Admin import | `/admin/import` | **NEW** | CLI seed scripts only; `ImportRun` model exists | Dropzone + validation preview + commit + template |
| Admin OCR review | `/admin/ocr-review` | **NEW** | Absent | Photo vs AI estimate; per-ingredient approve/reject/edit |
| Admin reports | `/admin/reports` | **NEW UI** | Feedback admin API + audit exist; no UI; reaction-shaped | UI on existing API + `approve_ingredient_correction` action |
| Admin sidebar | admin-shell | modify | no shell; 5 CRUD resources | shell + 4 items; demote Dashboard/Dishes/Ingredients/Dish-risks |

## 2. Data-model changes (Prisma / domain)
Ordered by necessity. Detail in `phase-05`.
1. **NEW `MenuItemIngredient`** `{ menuItemId, ingredientId, status(traffic-light),
   source, contributorType, verificationStatus }` — per-restaurant ingredient rows
   with provenance ("restaurant self-declared + N user contributions"). Today
   ingredients are Dish-scoped only (`DishIngredient`); `MenuItem` has just
   `ingredientNotes` free-text. **This is the only substantial new table.**
2. **Extend `SourceType`** with `ocr`, `user_contribution`; **`EvidenceType`** with `ocr`.
3. **`Dish` famous flag** — `isFamous` (or `featuredRank`) + seed Hà Nội famous dishes.
4. **`FeedbackEntityType` += `ingredient`** so "report wrong ingredient" targets an ingredient.
5. **New `FeedbackAdminActionType.approve_ingredient_correction`** — mutates the
   ingredient + traffic light and stamps `source=user_contribution` (existing
   actions only flip status/flags, never mutate data).
6. **Reporter reference** (nullable) on `FeedbackReport` for the reports "reporter" column.
7. **NEW OCR-review queue model** (`OcrReviewItem` + items, photo ref) + storage decision.
8. **Already present — no migration:** `Restaurant.lat/lon` (add to *list* DTO only);
   compatibility % (derive from suit/ask/avoid counts, no column); `ImportRun` (reuse).
9. **Biometric:** device-only (WebCrypto + Dexie); server credential table only if a
   server account model is chosen (open question).

## 3. Removals / demotions
- `/allergy-card` route → delete or `302 → /profile`; remove `app-header` IdCard
  shortcut + `showAllergyCard` CTAs in `restaurant-guide.tsx`, `dish-guide.tsx`.
- `/question-card` → demote destination; **keep** API + `buildQuestionCard` + hooks
  + display; trigger becomes contextual button on dish detail.
- `/dishes` → drop from bottom nav + `PROFILE_REQUIRED`; retire
  `DishFilterBar`/`DishGroupList` bucket UI (keep dish detail infra).
- `/restaurants` list guide → demote as tab; delete `restaurant-map-shell.tsx`.
- Post-meal `/feedback/new` + `/feedback/thanks` + reaction severity/timing/staff/
  trust steps + severe auto-flag branch → demote; **keep** the report+flag+audit+
  offline-outbox spine for ingredient corrections.
- Landing `/[locale]` "browse dishes" CTA → removed; first-run → `/login`.
- `PROFILE_REQUIRED` currently `['/dishes','/allergy-card','/question-card']` — all
  three cut; rewrite to v2 profile-dependent routes.
- Admin: demote Dashboard/Dishes/Ingredients/Dish-risks from first-class nav (CRUD kept).
- Restaurant detail A–E letter grade + OSM link → replaced by % ring + Open Google Maps.
- `/contact` — cut.

## 4. Decisions the stakeholder must make
Each has a **recommended default** so the plan is not blocked.
1. **Greenfield build strategy** — mock-first (recommended) vs real-now for
   `/login`, `/agent`, `/ocr`. Mock-first lets all 14 phases ship without waiting
   on WebAuthn/LLM/vision providers; real adapters swap in behind stable interfaces.
2. **Map stack** — MapLibre GL (vector, Google-Maps-like; recommended) vs Leaflet
   (raster, lighter) + a license-clean tile source (PWA/offline aware). Same choice powers the admin map.
3. **`/agent` brain** — scripted (recommended for v2) vs real LLM; which provider; where secrets live.
4. **`/ocr` vision** — provider + stub-vs-real; **where source photos are stored** (no media layer today).
5. **`defaultLocale`** — flip `en → vi` (v2 is VI-primary)? Changes unprefixed URL resolution.
6. **Admin console** — stays EN-only island vs becomes bilingual VI/EN.
7. **Reporter identity** — device identity from `/login` vs stay anonymous (crosses the
   current feedback pipeline's deliberate anonymity boundary).
8. **Severity + cross-contact** — where captured now that onboarding is 2 steps
   (profile-edit vs dropped)? Affects `build-profile.ts` defaults + recommendation accuracy.
9. **"Famous" signal** — editorial flag vs derived from `MenuItem.dishId` popularity; and
   is famous-detail the reused `/dishes/[dishId]` or a new `/famous/[id]`?
10. **Status palette** — does the 4-light user view collapse the internal 5th `risky`
    status into ask/avoid, or keep it distinct behind the scenes?
