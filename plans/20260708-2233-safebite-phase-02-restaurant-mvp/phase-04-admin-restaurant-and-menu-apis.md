# Phase 04 — Admin restaurant & menu APIs

**Context:** Spec §5, §9, §16 · pattern from `api/v1/admin/dishes/route.ts` (+`[dishId]`), `lib/admin-auth.ts` (`requireAdmin`), `lib/admin-schemas.ts`, `lib/api-response.ts`, `features/admin/admin-serializers.ts`.

## Overview
- **Priority:** P0.
- **Status:** Not started.
- Mirror the existing admin dish CRUD pattern for restaurants, menu items, and menu-item allergen statuses. Every handler: `requireAdmin` first, `parseQuery`/`parseBody` Zod, `apiOk`/`apiError` envelope, Prisma error mapping (`P2002`→409, `P2025`→404).

## Key insights (verified)
- Admin auth = `requireAdmin(req)` returning 401 envelope or null; cookie `sbt_admin` (SHA-256 digest of `ADMIN_TOKEN`). Reuse verbatim.
- Serializers convert Prisma `Decimal`/`Date`→JSON-safe (domain Zod rejects `Decimal`). Add restaurant/menu/allergen-status admin serializers.
- Public-facing free-text fields must use `safeLocalizedText`/`safeOptionalText` (denylist superRefine) in schemas.

## Endpoints (§9)
- Restaurant CRUD: `GET/POST /api/v1/admin/restaurants`, `GET/PATCH/DELETE /api/v1/admin/restaurants/[restaurantId]`.
- Review actions (§9.2): implement as **PATCH** on the restaurant (`{ reviewStatus }` / `{ verificationStatus:'flagged' }`) to avoid action endpoints — matches current no-action convention. (Approve/reject/flag = status transitions.)
- Menu item CRUD: `GET/POST /api/v1/admin/restaurants/[restaurantId]/menu-items`, `GET/PATCH/DELETE /api/v1/admin/menu-items/[menuItemId]`.
- Allergen statuses (§9.4, simpler form): `GET /api/v1/admin/menu-items/[menuItemId]/allergen-statuses`, `PUT` full-replacement array. (Skip per-status PATCH/DELETE for KISS unless needed.)

## Validation rules (§5.5)
- Reject/upsert duplicate `menuItemId+allergenId` (DB unique already enforces; return 409 or upsert in PUT replacement).
- If `riskLevel='unknown'` ⇒ `confidence ≤ 0.5` (Zod superRefine).
- `source='dish_inferred'` not written as explicit override unless admin confirms (flag in body).
- No AI/OCR source values accepted.
- Deletion (§9.1): block hard delete when menu items exist; prefer soft-delete/archive if feasible, else 409 with clear message.

## Related code files
- Create: `api/v1/admin/restaurants/route.ts`, `.../[restaurantId]/route.ts`, `.../[restaurantId]/menu-items/route.ts`, `api/v1/admin/menu-items/[menuItemId]/route.ts`, `.../[menuItemId]/allergen-statuses/route.ts`.
- Modify: `lib/admin-schemas.ts` (restaurant/menu/allergen-status create/update Zod, reusing enum lists), `features/admin/admin-serializers.ts` (add `adminRestaurantToDTO`, `adminMenuItemToDTO`, `adminAllergenStatusToDTO`).

## Implementation steps
1. Add Zod schemas (all §5.3/§5.4/§5.5 fields; safe-text on public fields; slug optional/generated).
2. Add serializers (Decimal→number, Date→ISO).
3. Restaurant route pair (list w/ filters §5.2: review/verification/menu/city/district/source/has_menu_items/needs_review; create w/ slug gen; patch incl. review actions; delete guard).
4. Menu-item routes (scoped by restaurantId; dish_id mapping).
5. Allergen-status GET + PUT replacement with validation.
6. `requireAdmin` on every handler; runtime `nodejs` + `force-dynamic`.

## Todo
- [ ] admin-schemas: restaurant/menu/allergen-status
- [ ] serializers
- [ ] restaurant route pair + filters + delete guard
- [ ] menu-item routes
- [ ] allergen-status GET/PUT + validation rules
- [ ] Prisma error mapping (409/404)

## Success criteria
All endpoints require auth (401 without cookie); invalid enum/confidence returns 400; duplicate allergen status handled; delete blocked when dependents exist; DTOs JSON-safe.

## Risks
- Decimal serialization bugs → central serializer + tests (Phase 09).
- Filter combinatorics → build `Prisma.RestaurantWhereInput` incrementally, default `all` where sensible for admin.

## Security
Admin cookie auth only; no user auth. Source/verification always explicit in DTO (§16.4). Zod on path/query/body.

## Next
Unblocks Phase 05 (admin UI).
