# Phase 05 — Admin restaurant & menu UI

**Context:** Spec §5, §14 · pattern from `features/admin/admin-resource-page.tsx` (generic `AdminResourcePage<T>`), `use-admin-resource.ts`, `admin-fields.tsx`, `dish-form.tsx`; `components/admin/admin-data-table.tsx`; `app/admin/layout.tsx`, `app/admin/admin-messages.ts` (English-only island, inline strings).

## Overview
- **Priority:** P0.
- **Status:** Not started.
- Admin console pages for restaurant review/CRUD, menu-item CRUD + dish mapping, and menu-item allergen-status editor. Reuse the generic admin resource pattern; add nav entries + inline EN strings.

## Key insights (verified)
- Admin is **not** locale-prefixed; uses raw `next/link`, its own QueryClient, and inline strings in `admin-messages.ts` (do NOT add to `messages/*.json`). Enum option lists live there as plain strings so forms never import `@prisma/client`.
- New resource recipe: Zod schema (Phase 04) + serializer + route pair + `<Entity>Form` (built from `admin-fields` primitives) + page wiring `AdminResourcePage` + nav entry.
- `AdminResourcePage` handles list/filter/create/edit panel/table; scoped-resource variant (see `dish-risks/page.tsx`) drives child resources via `extraQuery` + `key` remount.

## Routes (§5.1, adapted to convention)
- `/admin/restaurants` — table + filters + review actions.
- `/admin/restaurants/[restaurantId]` — detail + edit + "Manage menu".
- Menu managed as a **scoped resource** under the restaurant page (like dish-risks) rather than deep nested routes — simpler, matches convention. Allergen-status editor opens per menu item.

## Requirements
1. **Restaurant table** (§5.2 columns): name, city, district, cuisine, source, review_status, verification_status, menu_status, menu item count, last checked/observed, created/updated. Filters: review/verification/menu/city/district/source/has_menu_items/needs_review. Actions: view, edit, approve, reject, flag (PATCH), manage menu, delete (guarded).
2. **Restaurant form** (§5.3 fields): all fields incl. slug (generated, editable), external_source, statuses, source metadata, notes. Use `SelectField` for enums, `TextField`/`TextAreaField` for the rest.
3. **Menu item table/form** (§5.4): scoped by restaurant; dish_id mapping (searchable/text input like dish-risks dishId); shared_cookware/shared_fryer/can_customize selects; notes fields.
4. **Allergen-status editor** (§5.5): per menu item, add/remove rows (allergen select, risk_level, confidence, source, reason_en/vi, verification_status); PUT full-replacement array; client-side guard mirroring server (unknown⇒confidence≤0.5).

## Related code files
- Create: `app/admin/restaurants/page.tsx`, `app/admin/restaurants/[restaurantId]/page.tsx`; `features/admin/restaurant-form.tsx`, `menu-item-form.tsx`, `menu-item-allergen-status-editor.tsx`.
- Modify: `app/admin/layout.tsx` (nav entry), `app/admin/admin-messages.ts` (labels + enum lists), possibly `admin-data-table.tsx` (only if a new column type is needed — prefer reuse).

## Implementation steps
1. Add enum lists + labels to `admin-messages.ts`.
2. Build `RestaurantForm` from `admin-fields`; wire `AdminResourcePage basePath="/api/v1/admin/restaurants"`.
3. Add review-action buttons (approve/reject/flag → PATCH) in the row/detail.
4. Build scoped `MenuItemForm` on the restaurant detail page (`extraQuery={{restaurantId}}`).
5. Build `AllergenStatusEditor` (array form + PUT).
6. Accessibility (§14): text labels on badges, keyboard-accessible buttons, labeled inputs + error messages.

## Todo
- [ ] admin-messages: strings + enum lists
- [ ] RestaurantForm + list page + filters
- [ ] Review actions (approve/reject/flag)
- [ ] MenuItemForm scoped list
- [ ] AllergenStatusEditor (PUT replacement)
- [ ] Delete guard UX

## Success criteria
Admin can: view imported OSM/OpenMap rows, approve/reject/flag, CRUD restaurants, CRUD menu items, map to dish, add allergen statuses, set review/verification/menu status. Source & verification always visible (§16.4). Keyboard accessible.

## Risks
- Menu nesting complexity → keep scoped-resource approach, avoid deep routes (YAGNI).

## Security
Behind middleware + `requireAdmin`; no user auth. Inline EN strings only.

## Next
Enables §19.2 admin acceptance; supports Phase 03 demo approval and Phase 09 e2e seeding.
