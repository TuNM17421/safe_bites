# Phase 11 — Admin Excel/CSV Import UI

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta: [../migration-delta.md](../migration-delta.md) — row "Admin import | `/admin/import` | **NEW**" (§1) and §2.8 "`ImportRun` (reuse)".
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — admin "Import Excel" sidebar surface.
- Current code read for grounding:
  - `apps/web/scripts/seed/csv.ts` — CSV parse + field helpers to reuse.
  - `apps/web/scripts/seed/import-restaurants.ts` — the `importRestaurants(tx, rows)` importer shape.
  - `apps/web/scripts/import-seed.ts` — `writeImportRun(...)` + `$transaction` orchestration pattern.
  - `apps/web/src/app/api/v1/admin/restaurants/route.ts` — `requireAdmin` + `parseBody` route pattern.
  - `apps/web/src/lib/admin-auth.ts`, `apps/web/src/lib/api-response.ts` — auth + envelope helpers.
  - `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/admin-messages.ts` — EN-only admin island shell + copy.
  - `apps/web/prisma/schema.prisma` (lines 403–415) — existing `ImportRun` model.

## Overview
- **Priority:** Medium (admin data-ops enabler)
- **Current status:** Not started
- **Effort:** M
- **Risk:** Medium
- **Depends on:** phase-10 (admin shell/sidebar with the 4 v2 items + the `/admin/import` nav entry)
- **Description:** Give admins an in-app import replacing CLI-only seeding: a dropzone accepting `.xlsx`/`.csv`, a per-row Zod validation preview (valid vs needs-fix), a "commit N valid rows" action running transactionally, a template download, and an `ImportRun` audit row per commit. Imported restaurants stay `verificationStatus = 'unverified'` / `reviewStatus = 'needs_review'` — human-in-the-loop is preserved.

## Key Insights
- **Reuse, don't rebuild the importer.** `importRestaurants(db: Prisma.TransactionClient, rows: CsvRow[])` (scripts/seed/import-restaurants.ts) already normalizes OSM columns, **forces `verificationStatus: 'unverified'`** (line 66) and `reviewStatus` via `normalizeReview`. The route can call the same function inside `prisma.$transaction`. The CSV helpers (`field`, `orNull`, `splitList`, `toNumber`, `requireColumns`, `parseCsvContent`) are pure and import-safe from `scripts/seed/csv.ts`.
- **`ImportRun` already exists** (schema.prisma:403) with `sourceName/sourcePath/status/rowsRead/rowsInserted/rowsUpdated/rowsSkipped/errors(Json)/startedAt/finishedAt`. `writeImportRun(...)` in import-seed.ts:34 is the exact write shape to mirror (set `sourcePath` to the uploaded filename since there is no disk path). `Counts`/`newCounts()` live in `scripts/seed/types.ts`.
- **Admin is an EN-only i18n island** (admin-messages.ts header + layout.tsx:31 `locale="en"`). Copy for this page goes into `adminMessages` in `apps/web/src/app/admin/admin-messages.ts`, NOT `messages/{en,vi}.json`. The mockup nav label is bilingual, but per the phase-12 ADR the console stays English — add EN admin-message keys only (no VI/EN pair here). Use `next/link` + `next/navigation`, never `@/i18n/navigation`.
- **`csv-parse` is a devDependency today** (package.json:42). Moving CSV parsing into a runtime API route requires promoting it to `dependencies`; likewise the new xlsx parser (`exceljs` recommended — actively maintained, no prototype-pollution history vs older sheetjs) must be a runtime dep.
- **Route conventions:** every admin route starts `const denied = await requireAdmin(req); if (denied) return denied;`, validates with `parseBody`/`parseQuery`, returns `apiOk`/`apiError`, and sets `export const runtime = 'nodejs'` + `export const dynamic = 'force-dynamic'`. exceljs needs Node runtime — good, that matches.
- **Gotcha:** file upload is `multipart/form-data`, not JSON, so `parseBody` (which calls `req.json()`) cannot validate the raw upload. Parse the file server-side, then Zod-validate the *derived rows*, not the request body.

## Requirements
**Functional**
1. `/admin/import` page: drag-and-drop + file-picker dropzone accepting `.xlsx` and `.csv`; reject other types client-side.
2. On file select, POST to a preview/validate step returning per-row `{ rowNumber, values, status: 'valid' | 'needs_fix', issues[] }` and a column list. Render a table with valid/needs-fix badges (sb traffic-light tokens: green=valid, yellow/red=needs-fix).
3. "Import N valid rows" button commits only valid rows transactionally; needs-fix rows are skipped and reported.
4. "Download template" produces a `.csv` (and/or `.xlsx`) with the required restaurant columns and one example row.
5. Every commit writes one `ImportRun` (`status` success/failed, row counts, `errors` JSON for skipped rows).
6. On success, show counts (read/inserted/updated/skipped) and a link back to `/admin/restaurants`.

**Non-functional**
- Files under 200 lines each; split UI (dropzone, preview table, page) and server (parser, route, validation schema) into focused modules.
- Import target for v2 is **restaurants** (matches the existing importer + admin restaurants surface). Keep the parser dispatch shaped so other entity types can be added later (YAGNI: only restaurants now).
- Reuse existing Zod row schema where one exists; otherwise a new `importRestaurantRowSchema` mirroring `restaurantCreateSchema` required fields.

## Architecture
```
/admin/import (page.tsx, client)
  └─ import-dropzone.tsx ──file──▶ POST /api/v1/admin/import?mode=preview (multipart)
                                       │  parse (xlsx→exceljs | csv→parseCsvContent)
                                       │  → rows → importRestaurantRowSchema.safeParse each
                                       ◀── { columns, rows:[{n,values,status,issues}] }
  └─ import-preview-table.tsx (badges) 
  └─ "Import valid" ──────────────▶ POST /api/v1/admin/import?mode=commit (multipart)
                                       │  parse → validate → filter valid
                                       │  prisma.$transaction(importRestaurants(tx, validRows))
                                       │  writeImportRun(name, filename, status, counts, errors)
                                       ◀── { counts, skipped }
  └─ "Download template" ─────────▶ GET /api/v1/admin/import/template (text/csv attachment)
```
- Parser module `scripts/seed/xlsx.ts` (or `src/features/admin/import/parse-workbook.ts`) converts a `.xlsx` buffer to the same `CsvRow[]` shape `importRestaurants` expects, so both formats share one downstream path.
- Preview and commit share one `parseAndValidate(buffer, filename)` helper to guarantee the preview matches what commit inserts.

## Related Code Files
**Create**
- `apps/web/src/app/admin/import/page.tsx` — client page: heading + dropzone + preview + actions.
- `apps/web/src/features/admin/import/import-dropzone.tsx` — file input/drag-drop, type guard.
- `apps/web/src/features/admin/import/import-preview-table.tsx` — rows with valid/needs-fix badges + issue tooltips.
- `apps/web/src/features/admin/import/use-import.ts` — client fetch hooks (preview/commit) via TanStack Query mutation.
- `apps/web/src/app/api/v1/admin/import/route.ts` — `POST` preview+commit (mode query), `requireAdmin`, Node runtime.
- `apps/web/src/app/api/v1/admin/import/template/route.ts` — `GET` template download.
- `apps/web/scripts/seed/xlsx.ts` — exceljs `.xlsx` buffer → `CsvRow[]` (shared with CLI later).
- `apps/web/src/lib/import-schemas.ts` (or extend `admin-schemas.ts`) — `importRestaurantRowSchema` + preview/commit result types.
- `apps/web/src/features/admin/import/import-service.ts` — `parseAndValidate()` + `runImport()` wrapping `importRestaurants` + `ImportRun` write (server-only).

**Modify**
- `apps/web/package.json` — promote `csv-parse` to `dependencies`; add `exceljs` to `dependencies`.
- `apps/web/src/app/admin/admin-messages.ts` — add `nav.import` + an `import` copy block (EN-only).
- `apps/web/scripts/import-seed.ts` — optionally export `writeImportRun` shape / factor a shared `writeImportRun` into a small module so the route and CLI don't duplicate it (DRY; keep under 200 lines).

**Delete** — none.

## Implementation Steps
1. Promote `csv-parse` to `dependencies` and add `exceljs` to `dependencies` in `apps/web/package.json`; install; run `pnpm --filter @safebite/web typecheck`.
2. Add `scripts/seed/xlsx.ts`: read first worksheet with exceljs from a `Buffer`/`ArrayBuffer`, map header row → keys, emit `CsvRow[]` (string values, trimmed) matching `parseCsvContent` output.
3. Add `importRestaurantRowSchema` (mirror required cols from `import-restaurants.ts`: `restaurant_id`, `canonical_name`, `city`; type/coerce optional numeric/list fields) in `import-schemas.ts`, plus `PreviewRow`/`ImportResult` types.
4. Add server `import-service.ts`: `parseAndValidate(buffer, filename)` dispatching by extension (`.csv`→`parseCsvContent`, `.xlsx`→`xlsx.ts`), running `requireColumns` then per-row `safeParse`, returning `{ columns, rows }`. `runImport(validRows, filename)` calls `prisma.$transaction((tx)=>importRestaurants(tx, validRows))` then writes an `ImportRun` (mirror `writeImportRun` in import-seed.ts:34, `sourcePath = filename`).
5. Add `POST /api/v1/admin/import/route.ts`: `requireAdmin`; read `multipart/form-data` via `req.formData()`; guard file size + extension; branch on `?mode=preview|commit`. Preview → `parseAndValidate` → `apiOk({columns, rows})`. Commit → validate again → filter valid → `runImport` → `apiOk({counts, skipped})`. Wrap in try/catch → `apiError('IMPORT_FAILED', …, {status:500})` and still write a failed `ImportRun`.
6. Add `GET /api/v1/admin/import/template/route.ts`: `requireAdmin`; build a CSV string (header + one example row) and return `new NextResponse(csv, { headers: { 'content-type':'text/csv', 'content-disposition':'attachment; filename="restaurants-template.csv"' } })`.
7. Build UI: `import-dropzone.tsx` (accept `.xlsx,.csv`, drag events, client-side type guard), `use-import.ts` (TanStack mutations posting `FormData`), `import-preview-table.tsx` (badge per row using sb traffic-light tokens + issue list), `page.tsx` composing them with heading, template-download link, and disabled "Import N valid rows" until a valid preview exists.
8. Add EN copy keys to `admin-messages.ts` (`nav.import`, `import.heading/dropzone/preview/commit/template/success/...`) and wire nav entry (nav array itself is edited in phase-10; confirm `import` key resolves).
9. Verify column preview + badges match commit results (same validator both paths). Add a unit test for `parseAndValidate` (csv + xlsx fixtures) and `importRestaurantRowSchema`.
10. `pnpm --filter @safebite/web lint && typecheck && test`; manual smoke: upload a small `.csv` and `.xlsx`, confirm preview → commit → `ImportRun` row → restaurants appear as `needs_review`.

## Todo
- [ ] Promote `csv-parse`; add `exceljs` to runtime deps; typecheck.
- [ ] `scripts/seed/xlsx.ts` — xlsx buffer → `CsvRow[]`.
- [ ] `importRestaurantRowSchema` + preview/commit types in `import-schemas.ts`.
- [ ] `import-service.ts` — `parseAndValidate` + `runImport` (+ `ImportRun` write).
- [ ] `POST /api/v1/admin/import` — preview + commit modes, multipart, requireAdmin, Node runtime.
- [ ] `GET /api/v1/admin/import/template` — CSV attachment.
- [ ] UI: dropzone, preview table (traffic-light badges), use-import hooks, page.
- [ ] EN admin-message keys; nav entry resolves.
- [ ] Unit tests for parser + row schema; shared validator across preview/commit.
- [ ] lint + typecheck + test + manual smoke.

## Success Criteria
- Admin can drag a `.xlsx` or `.csv` onto `/admin/import`, see a per-row valid/needs-fix preview with real column names, and commit only valid rows.
- Committed restaurants persist with `verificationStatus = 'unverified'` and `reviewStatus = 'needs_review'` (verified by the reused importer).
- Each commit creates exactly one `ImportRun` with correct `rowsRead/Inserted/Updated/Skipped` and `errors` populated for skipped rows.
- Template download returns a valid CSV with required headers.
- Preview classification and commit inserts agree (same Zod validator).
- `pnpm --filter @safebite/web typecheck`, `lint`, and `test` pass; new parser/schema unit tests green.

## Risk Assessment
- **xlsx parser choice / bundle + native risk** → use `exceljs` (pure JS, Node runtime already set); pin version; only import in server modules so it never reaches client bundles.
- **Malformed/huge files** → enforce a max file size and a max row count in the route before parsing; reject unknown extensions; wrap parsing in try/catch → `apiError`.
- **Partial-commit corruption** → all inserts run inside one `prisma.$transaction` (existing pattern); a failure rolls back and writes a `failed` ImportRun.
- **Preview/commit drift** → single shared `parseAndValidate`; commit re-validates the uploaded file rather than trusting client-sent rows.
- **Dep-promotion breakage** → run typecheck/build after moving `csv-parse` and adding `exceljs`; CLI seed path (`scripts/seed/csv.ts`) unchanged.

## Security Considerations
- **Auth:** both routes call `requireAdmin(req)` first (cookie-digest guard, admin-auth.ts); no unauthenticated import or template access.
- **Zod at the boundary:** derived rows validated with `importRestaurantRowSchema`; `?mode` validated against an enum; commit never trusts client-supplied parsed rows — it re-parses the file.
- **Upload hardening:** enforce extension allowlist (`.xlsx`/`.csv`), MIME/size limits, and row-count cap to bound memory; never write the upload to disk (parse in-memory buffer). `runtime = 'nodejs'` (exceljs needs Node), `dynamic = 'force-dynamic'`.
- **Provenance / human-in-the-loop:** imported rows are forced `unverified` + `needs_review` by the reused importer — never auto-verified. `ImportRun` records who-imported-what-when (source filename + counts + errors) as an audit trail.
- **No secret/PII leakage:** `apiError` returns stable codes only, no stack traces; import errors summarized as row numbers + issue codes.

## Next Steps
- Unblocks admin data operations at scale (bulk restaurant onboarding) feeding the map+list admin surface (phase-10) and the user-facing map home.
- Establishes the `ImportRun`-backed audit + shared parser that later OCR-review (phase-13) and reports (phase-14) surfaces can reference for provenance.
- Future: extend parser dispatch to dishes/ingredients entity types and add an ImportRun history view (deferred — YAGNI until requested).
