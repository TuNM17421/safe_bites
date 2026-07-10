# Phase 12 — /ocr scanner + /admin/ocr-review (mock vision first)

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta (§1 OCR rows, §2.2/§2.7 data-model, §4.4 vision/photo decision): [../migration-delta.md](../migration-delta.md)
- Data-model dependency: [./phase-05-data-model-foundation.md](./phase-05-data-model-foundation.md) (`MenuItemIngredient`, `SourceType.ocr`, `EvidenceType.ocr`)
- Admin shell dependency: [./phase-10-admin-restaurants-map-list.md](./phase-10-admin-restaurants-map-list.md)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — `/ocr` (lines 536–553: viewfinder + scanline + `aiTag` + `notice--warn` + predicted-ingredient card + verdict chip + "Tìm quán bán…" button) and `/admin/ocr-review` (lines 689–725: photo ↔ AI two-pane, per-row ok/edit/reject, "Duyệt mục đã kiểm / Từ chối", "không tự động gắn đã xác minh").
- Current schema: `apps/web/prisma/schema.prisma`
- API/auth patterns to reuse: `apps/web/src/app/api/v1/feedback/route.ts` (public + `rateLimit`/`clientKey` + `parseBody`), `apps/web/src/app/api/v1/admin/feedback/[reportId]/actions/route.ts` (`requireAdmin` + audit), `apps/web/src/lib/api-response.ts`
- Admin island: `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/admin-messages.ts`
- Public i18n: `apps/web/messages/en.json`, `apps/web/messages/vi.json`

## Overview
- **Priority:** Medium (net-new surface; not blocking other phases)
- **Current status:** Not started
- **Effort:** XL
- **Risk:** High (camera/getUserMedia across devices; new photo-storage decision; new model + two greenfield UIs)
- **Depends on:** phase-05 (enum + `MenuItemIngredient` provenance), phase-10 (admin shell/sidebar it slots into)
Ship the camera OCR flow (`/ocr`) and its admin review queue (`/admin/ocr-review`) end-to-end against a **stubbed predictor** behind a stable interface, so a real vision provider swaps in later without touching UI. Every prediction is `source=ocr`, `unverified`, framed as a *general recipe, not this restaurant's* — nothing is auto-verified; an admin confirms per ingredient (human-in-the-loop).

## Key Insights
- **No camera/vision/media layer exists today.** Grep for `getUserMedia`/`ocr` returns only the mockup. This is fully greenfield; there is no photo storage abstraction (open decision #4) — the phase must make the storage call.
- **Reuse the public+admin API spine verbatim.** `feedback/route.ts` shows the public shape: `rateLimit(clientKey(req))` → `parseBody(req, ZodSchema)` → `apiOk/apiError`, `runtime='nodejs'`, `dynamic='force-dynamic'`. Admin actions route shows `requireAdmin(req)` gate + audit write. Copy both; do not invent a new pattern.
- **Enums/table land in phase-05, not here.** `SourceType.ocr`, `EvidenceType.ocr`, and `MenuItemIngredient { status, source, contributorType, verificationStatus }` are added in phase-05. This phase **consumes** them: an approved OCR ingredient becomes a `MenuItemIngredient` with `source=ocr`, `contributorType='ocr'`, `verificationStatus` flipped only by the admin action.
- **Traffic-light values already fixed.** Engine vocabulary is `suitable|ask_first|risky|avoid|unknown` (`RecommendationStatus`, `schema.prisma:36`); user view = green/yellow/red/grey. Predicted ingredient dots + the verdict chip MUST reuse the existing status token/pill used by dish/restaurant guides — do not add OCR-specific colors.
- **Admin is an EN-only intl island.** `admin/layout.tsx` uses `next/link` + `next/navigation` + fixed `locale="en"` fed by `admin-messages.ts` (NOT `messages/*.json`). OCR-review strings go in `admin-messages.ts`; the new sidebar item is added to that file's `NAV`/`nav`. Public `/ocr` strings go in `messages/{en,vi}.json` via `useTranslations`.
- **`/ocr` is inside the `(app)` route group** (`apps/web/src/app/[locale]/(app)/…`), so it inherits `BottomNav` (the OCR tab is added in phase-01) and must use `@/i18n/navigation` `Link`/`router`, never `next/link`.
- **Gotcha — camera needs a client boundary.** `getUserMedia` is browser-only; the `page.tsx` stays an RSC shell and delegates to a `'use client'` viewfinder component. Must handle permission-denied / no-camera / insecure-context and offer a file-input fallback.
- **Gotcha — Decimal + provenance.** Confidence is `Decimal(3,2)` in `MenuItemIngredient`; coerce with the existing `num()` serializer helper. `source`/`contributorType` are set **server-side**, never trusted from the client body.

## Requirements
### Functional
1. `/ocr`: live `getUserMedia` viewfinder with animated scanline; capture button freezes a frame and calls the predict API.
2. Prediction renders: dish name + predicted ingredient rows with traffic-light dots, an overall verdict chip (e.g. "Peanut: likely"), and the mandatory **"general recipe — NOT this restaurant's — ask staff"** warning.
3. "Find restaurants serving <dish>" button routes to map/famous filtered by the predicted dish (via `@/i18n/navigation` router).
4. `POST /api/v1/ocr`: Zod-validated, rate-limited, returns a canned dish+ingredient prediction (`source=ocr`, `verificationStatus=unverified`, `evidenceType=ocr`) behind an `OcrPredictor` interface; optionally enqueues an `OcrReviewItem` when the user submits the photo for review.
5. New `OcrReviewItem` (+ per-ingredient rows) Prisma model with a photo reference; a documented photo-storage decision.
6. `/admin/ocr-review`: queue of pending items; per item, photo ↔ AI estimate two-pane; per-ingredient **approve / reject / edit**; "approve checked" promotes approved rows to `MenuItemIngredient` (`source=ocr`), stamps the item reviewed, and writes an audit row. Nothing is auto-verified.

### Non-functional
- Predictor is swappable: stub today, real provider later, same interface — no UI/route change on swap.
- No hardcoded UI strings: `/ocr` via `useTranslations('ocr')` in `messages/{en,vi}.json`; admin via `admin-messages.ts`. Semantic `sb-*`/status tokens only.
- Files <200 lines; split viewfinder, prediction panel, and review two-pane into focused components. RSC-first (client only at the camera/interactive leaves).

## Architecture
- **Predictor interface (domain/server):** `OcrPredictor.predict(input) → { dishNameVi/En, ingredients: [{ nameVi/En, status, confidence, note? }], verdict }`. Stub returns a canned Gỏi cuốn / Phở-style payload. Swap point isolated in `apps/web/src/server/ocr/predictor.ts`.
- **Public flow:** client viewfinder → capture frame → `POST /api/v1/ocr` (Zod body: locale, optional allergen context, optional `submitForReview` + image payload) → `apiOk(prediction)` → render dots/chip/warning. Predict is stateless; only an explicit "submit for review" persists an `OcrReviewItem`.
- **Photo-storage decision (recommended default):** predict path stores **no** server photo (privacy/on-device — the frame stays in the browser). Only an explicit review submission persists the image; for mock-first, store it as a bounded base64 data URL / object key string in `OcrReviewItem.photoRef` (single field), deferring a real object-storage/R2 adapter behind that field. Document this ADR in the phase; enforce a max size + strip EXIF.
- **Review model:** `OcrReviewItem { id, dishGuessVi/En, photoRef, restaurantId?, menuItemId?, status(needs_review|approved|rejected default needs_review), reviewedAt?, reviewedBy?, createdAt, updatedAt }` + `OcrReviewIngredient { id, itemId, ingredientId?, rawName, status, confidence?, decision(pending|approved|rejected|edited), editedName? }`. FK cascade on delete; indexed by `status`.
- **Admin flow:** `GET /api/v1/admin/ocr-review` (list pending) + `POST /api/v1/admin/ocr-review/[itemId]/actions` (per-item decision) both behind `requireAdmin`; approve promotes approved ingredient rows into `MenuItemIngredient` (phase-05) in a transaction and writes an audit trail (mirror `FeedbackAdminAction`).

## Related Code Files
### Modify
- `apps/web/prisma/schema.prisma` — add `OcrReviewItem` + `OcrReviewIngredient` models, back-relations on `MenuItem`/`Restaurant`/`Ingredient`, `status`/`ReviewStatus` reuse, indexes; new Prisma migration.
- `apps/web/src/app/admin/layout.tsx` — add `/admin/ocr-review` to `NAV` (coordinate with phase-10's 4-item sidebar).
- `apps/web/src/app/admin/admin-messages.ts` — add `nav.ocrReview` + an `ocrReview` string block (EN-only island).
- `apps/web/messages/en.json` & `apps/web/messages/vi.json` — new `ocr` namespace: add product-approved VI/EN keys (viewfinder hints, general-recipe warning, verdict chip, find-restaurants CTA, permission/fallback states). Do not invent copy.
- `packages/domain/src/index.ts` — export the OCR Zod schemas + predictor types.
### Create
- `apps/web/src/app/[locale]/(app)/ocr/page.tsx` — RSC shell (title, disclaimer) rendering the client viewfinder.
- `apps/web/src/features/ocr/ocr-scanner.tsx` — `'use client'` getUserMedia viewfinder + scanline + capture + permission/fallback handling.
- `apps/web/src/features/ocr/ocr-prediction-panel.tsx` — predicted ingredient rows (dots), verdict chip, warning, find-restaurants button.
- `apps/web/src/app/api/v1/ocr/route.ts` — public predict (rate-limited, Zod, stub predictor).
- `apps/web/src/app/api/v1/admin/ocr-review/route.ts` — admin list (requireAdmin).
- `apps/web/src/app/api/v1/admin/ocr-review/[itemId]/actions/route.ts` — admin per-item approve/reject/edit + audit.
- `apps/web/src/app/admin/ocr-review/page.tsx` + `apps/web/src/features/admin-ocr-review/*` — two-pane review UI (photo ↔ estimate, per-row controls).
- `apps/web/src/server/ocr/predictor.ts` — `OcrPredictor` interface + stub implementation (canned payload).
- `apps/web/src/server/ocr/review-service.ts` — enqueue item, apply admin decision → `MenuItemIngredient` promotion in a transaction + audit.
- `packages/domain/src/ocr/schemas.ts` — Zod for predict request/response, review item, admin decision.
### Delete
- None.

## Implementation Steps
1. **Domain Zod:** create `ocr/schemas.ts` — predict req/resp, review item, admin decision schemas; export from the barrel.
2. **Predictor:** `server/ocr/predictor.ts` — `OcrPredictor` interface + stub returning a canned dish+ingredients (statuses drawn from the engine vocabulary, `confidence` set).
3. **Schema + migrate:** add `OcrReviewItem`/`OcrReviewIngredient` + relations + indexes; `prisma migrate dev` (directUrl per ADR-008); regenerate client.
4. **Public predict route:** `api/v1/ocr/route.ts` — `rateLimit`/`clientKey`, `parseBody`, call predictor, `apiOk`; server-set `source=ocr`; persist `OcrReviewItem` only when `submitForReview` (bounded photo, EXIF-stripped).
5. **`/ocr` UI:** RSC `page.tsx` + client `ocr-scanner.tsx` (viewfinder, scanline, capture, permission-denied/no-camera/file-input fallback) + `ocr-prediction-panel.tsx` (dots, verdict chip, general-recipe warning, find-restaurants CTA via `@/i18n/navigation`).
6. **i18n:** add `ocr` namespace keys to `messages/{en,vi}.json` (product-approved VI/EN); wire `useTranslations('ocr')`.
7. **Admin review service:** `server/ocr/review-service.ts` — list pending; apply decision → in a transaction promote approved rows to `MenuItemIngredient` (`source=ocr`, `verificationStatus` set by action), stamp item reviewed, write audit.
8. **Admin routes:** list + `[itemId]/actions`, both `requireAdmin`, Zod-validated.
9. **Admin UI:** `admin/ocr-review/page.tsx` + two-pane feature components; add sidebar `NAV` entry + `admin-messages` strings.
10. **Verify:** monorepo typecheck; unit-test the predictor stub + review promotion (approved→`MenuItemIngredient`, rejected→no write, nothing auto-verified); manual camera smoke on mobile + desktop fallback.

## Todo
- [ ] `packages/domain/src/ocr/schemas.ts` + barrel export
- [ ] `OcrPredictor` interface + stub predictor
- [ ] `OcrReviewItem`/`OcrReviewIngredient` models + migration + client regen
- [ ] Public `POST /api/v1/ocr` (rate-limited, Zod, stub, server-set provenance)
- [ ] `/ocr` RSC shell + client viewfinder + prediction panel (dots/chip/warning/CTA)
- [ ] `ocr` i18n namespace (product-approved VI/EN keys)
- [ ] Review service: list + decision → `MenuItemIngredient` promotion + audit
- [ ] Admin list + actions routes (`requireAdmin`, Zod)
- [ ] `/admin/ocr-review` two-pane UI + sidebar item + `admin-messages`
- [ ] Typecheck + predictor/promotion unit tests + camera smoke test

## Success Criteria
- Monorepo typecheck passes; new migration applies cleanly and is additive.
- `POST /api/v1/ocr` returns a Zod-valid canned prediction with `source=ocr`/`unverified`; swapping the predictor implementation requires no route/UI change (interface boundary proven by a stub-swap unit test).
- `/ocr` shows a live viewfinder on a camera device, degrades to file-input on denial/insecure context, and always renders the general-recipe warning + traffic-light dots + verdict chip.
- Admin approve promotes only checked ingredients into `MenuItemIngredient` (`source=ocr`), stamps the item reviewed, writes an audit row; reject writes nothing; **no** row is ever `verificationStatus=verified` without an admin action (asserted in tests).
- No hardcoded UI strings (all via `useTranslations`/`admin-messages`); no raw colors; files <200 lines.

## Risk Assessment
- **Camera portability (high):** `getUserMedia` fails on HTTP/older iOS/denied permission. Mitigation: secure-context check, explicit permission states, file-input fallback, no crash path.
- **Photo storage scope creep:** temptation to build a full media/object-store layer now. Mitigation: single `photoRef` field + bounded base64/data-URL for mock; real adapter deferred behind that field (YAGNI).
- **Provenance spoofing:** client could claim `source=restaurant`. Mitigation: `source`/`contributorType` set server-side only; predict never writes verified data.
- **Predictor lock-in:** a leaky stub shape blocks the real provider. Mitigation: freeze the `OcrPredictor` interface + Zod response contract first; stub conforms to it.
- **Admin/phase-05 coupling:** promotion depends on phase-05's `MenuItemIngredient` + `SourceType.ocr`. Mitigation: gate on phase-05; typecheck catches enum/field drift.

## Security Considerations
- **Auth:** admin routes gated by `requireAdmin` (mirror feedback-actions route); public predict rate-limited via `clientKey`.
- **Zod at every boundary:** predict request/response, review submission, and admin decision all validated; `status`/`contributorType` constrained to enums server-side.
- **PII / on-device:** predict stores no photo by default (frame stays in-browser); review submissions are opt-in, size-capped, EXIF-stripped; store no identity/location with the image.
- **Provenance & human-in-the-loop:** OCR output is `source=ocr`/`unverified`, surfaced as a general-recipe estimate; only an admin action flips verification and creates `MenuItemIngredient`, with a full audit trail — nothing auto-verified.

## Next Steps
Unblocks a real vision provider swap behind `OcrPredictor` (no UI change), OCR-sourced ingredient contributions feeding restaurant-dish detail provenance ("+ N OCR/user contributions"), and the admin Reports/audit surface (OCR review actions share the audit convention). Coordinates with phase-01 (OCR bottom-nav tab) and phase-10 (admin sidebar) for navigation entry points.
