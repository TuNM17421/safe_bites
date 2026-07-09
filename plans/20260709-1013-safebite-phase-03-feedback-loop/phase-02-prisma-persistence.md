# Phase 02 — Prisma Persistence (Feedback models, enums, migration)

## Context Links
- Spec: `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` §7.1 (enums), §7.2 (FeedbackReport), §7.3 (FeedbackFlag), §7.4 (FeedbackAdminAction), §7.5 (existing-model relations), §17.2 (submission tx shape), §17.3 (severe auto-flag fields), §2.3 (privacy / minimal snapshot).
- Reality map: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/codebase-reality-map.md` §1 (Prisma), §0 (deltas).
- Contract: `plans/20260709-1013-safebite-phase-03-feedback-loop/research/interface-contract.md` ("Prisma" section, enum lists).
- Consumers (do NOT build here): [[phase-03-public-feedback-api]] (create/query services), [[phase-04-recommendation-integration]] (flag→signal load).

## Overview
- **Priority:** P0 (foundational — every other Phase 03 code path depends on these tables).
- **Current status:** Not started.
- One paragraph: Add 9 feedback enums + 3 models (`FeedbackReport`, `FeedbackFlag`, `FeedbackAdminAction`) to `apps/web/prisma/schema.prisma`, wire back-relations onto the existing `Restaurant`, `MenuItem`, `Dish` models, and generate an additive migration `phase03_feedback_loop`. Schema + migration ONLY — no services, no routes. The shape must be capable of supporting the submission transaction in §17.2 (report + flags + system action in one `$transaction`) and idempotency via `clientReportId @unique`.

## Key Insights (grounded facts + spec deltas)
- **FK target is `MenuItem`, not `RestaurantMenuItem`.** Spec §7.2/§7.5 name `RestaurantMenuItem` — that model does not exist. The menu model is `MenuItem` (`schema.prisma:252`). All `menuItem` relations and the `feedbackReports` back-relation attach to `MenuItem`.
- **New ids use `@default(cuid())`.** Core models (`Restaurant`/`MenuItem`/`Dish`/`Allergen`) take caller-supplied `String @id @map(...)`, but audit-like tables (`DishAllergenRisk:175`, `MenuItemAllergenStatus:292`, `ImportRun:318`) use `cuid()`. Feedback tables are audit-like → `cuid()`. `clientReportId` is the client-supplied idempotency key (`@unique`), NOT the pk.
- **Every domain column `@map`s to snake_case.** Prisma's managed `createdAt`/`updatedAt` intentionally stay camelCase columns (see `MenuItemAllergenStatus:302-303` → columns `createdAt`/`updatedAt`). Match that exactly: `@map` all business fields; leave `createdAt`/`updatedAt` unmapped.
- **`String[]` scalar lists are supported and used** (`Restaurant.cuisineNormalized:215` `@default([])`). So `allergenIds String[]` is correct — do NOT create a `FeedbackReportAllergen` join table (spec §7.2 note only suggested that as a fallback if scalar lists were unsupported; they are supported).
- **Enum values are already snake_case in the spec** — keep them verbatim. This matches every existing enum (`ReviewStatus`, `RiskLevel`, `RecommendationStatus:36`). Do NOT PascalCase.
- **Additive-migration convention:** Phase 02 migration (`20260708230000_phase02_restaurant_menu/migration.sql`) is pure `CREATE TABLE` / `CREATE TYPE` / `ALTER TABLE ADD COLUMN` / `CREATE INDEX` / `ADD CONSTRAINT`. No drops, no column-type changes. Follow this: **do not convert any existing free-text column (e.g. `Restaurant.verificationStatus String`) into an enum.**
- **Privacy (§2.3):** `profileSnapshot Json` must hold only `{ allergies:[{allergenId,severity,crossContactSensitive}], dietaryProfiles:[] }` — never the whole store, never location. `allergenIds String[]` is the flat allergen index. No lat/lon/distance columns anywhere. Free-text (`notes`, `staffAnswerText`) length-limits are enforced in Zod/UI (later phases), not the DB.
- **Migration uses `DIRECT_URL`** (`datasource db { directUrl = env("DIRECT_URL") }`, `schema.prisma:8`); `prisma migrate dev` reads it automatically. Runtime uses pooled `DATABASE_URL` via the `prisma` singleton in `lib/db.ts`.
- **`quality` CI job has no DB.** Nothing in this phase runs in unit tests; `prisma generate` (in the quality job) must still succeed, so the schema must be valid Prisma. DB verification is e2e-only.

## Requirements
### Functional
1. 9 new enums with the exact snake_case members listed in §7.1 / the contract.
2. `FeedbackReport` with `clientReportId @unique`, FK→`Restaurant` (Cascade), optional FK→`MenuItem` (SetNull), optional FK→`Dish` (SetNull), `allergenIds String[]`, `profileSnapshot Json`, optional `recommendationSnapshot Json`, status/priority/severeAutoFlagged, review columns, and the 4 spec indexes.
3. `FeedbackFlag` with optional FK→`FeedbackReport` (SetNull), scalar entity ids (`entityType`/`entityId`/`restaurantId?`/`menuItemId?`/`dishId?`/`allergenId?`), effect/status/priority, `readinessCap?`, `confidenceDelta?`, `expiresAt?`, resolution columns, and the 5 spec indexes.
4. `FeedbackAdminAction` with FK→`FeedbackReport` (Cascade), optional FK→`FeedbackFlag` (SetNull), `actionType`, `actor`, `before?`/`after? Json`, and 2 spec indexes.
5. Back-relations `feedbackReports FeedbackReport[]` on `Restaurant`, `MenuItem`, `Dish`.
6. A single additive migration folder generated via `prisma migrate dev --name phase03_feedback_loop`.

### Non-functional
- `pnpm --filter web prisma validate` and `prisma generate` pass. All new columns `@map`ped snake_case. Files/blocks follow existing formatting. No edits to existing columns.

## Architecture
Data flow this schema must support (built in later phases):
```
POST /api/v1/feedback (phase-03)
  └─ planFeedbackReport(input, resolved)      [pure, DB-free]
  └─ persistFeedbackReport(plan)  → prisma.$transaction([
        FeedbackReport.create({ clientReportId, ...snapshots, allergenIds }),
        FeedbackFlag.createMany(...)          // §17.3, only severe/anaphylaxis
        FeedbackAdminAction.create(system add_note / auto)  // actor="system"
     ])
  idempotency: clientReportId @unique → P2002 race → re-read existing + flags

recommendations/* (phase-04)
  └─ loadActiveFeedbackFlags({restaurantIds,menuItemIds,dishIds})  // reads FeedbackFlag WHERE status=active
```
Relationship map:
```
Restaurant 1─* FeedbackReport   (Cascade on delete)
MenuItem   1─* FeedbackReport   (SetNull)      ← MenuItem, NOT RestaurantMenuItem
Dish       1─* FeedbackReport   (SetNull)
FeedbackReport 1─* FeedbackFlag         (SetNull; flags can outlive report edits)
FeedbackReport 1─* FeedbackAdminAction  (Cascade)
FeedbackFlag   1─* FeedbackAdminAction  (SetNull)
FeedbackFlag: entity ids are plain scalars (no FK) so a flag can target restaurant | menu_item | dish uniformly.
```

## Related Code Files
### Modify
- `apps/web/prisma/schema.prisma` — add enums (after existing enum block, before `// ---------- Core models`), add 3 models (end of file, after `ImportRun`), add `feedbackReports FeedbackReport[]` to `Restaurant` (`:242` region), `MenuItem` (`:280` region), `Dish` (`:154-155` region).

### Create
- `apps/web/prisma/migrations/<generated-timestamp>_phase03_feedback_loop/migration.sql` — produced by the migrate command (do not hand-write; verify it is additive-only).

### Delete
- None.

## Implementation Steps
1. **Enums** — insert the 9 enums verbatim into `schema.prisma` immediately after the `Strictness` enum (`:77`), before `// ---------- Core models (§5.2) ----------`:
```prisma
enum FeedbackReportStatus { needs_review in_review resolved dismissed spam }
enum FeedbackPriority { low normal high urgent }
enum FeedbackReaction { none mild moderate severe anaphylaxis_or_emergency not_sure prefer_not_to_say }
enum FeedbackReactionTiming { during_meal within_2_hours later_same_day next_day_or_later not_sure not_applicable }
enum StaffAnswer { confirmed_no_allergen confirmed_contains_allergen confirmed_can_remove confirmed_cannot_remove kitchen_checked not_sure language_barrier no_answer other }
enum FeedbackFlagStatus { active resolved dismissed expired }
enum FeedbackFlagEffect { flag_for_review downgrade_confidence suppress_suitable cap_restaurant_readiness hide_recommendation }
enum FeedbackEntityType { restaurant menu_item dish }
enum FeedbackAdminActionType { start_review resolve_no_change dismiss_report mark_spam confirm_feedback_flag clear_feedback_flag request_reverification apply_confidence_downgrade suppress_suitable_until_review hide_menu_item_temporarily add_note }
```
(Keep one member per line as the file does; compacted here for brevity.)

2. **`FeedbackReport` model** — append at end of file. Paste-ready, `@map`ped, FK→`MenuItem`:
```prisma
model FeedbackReport {
  id                     String                 @id @default(cuid())
  clientReportId         String                 @unique @map("client_report_id")
  city                   String
  locale                 String?
  clientPlatform         String                 @default("pwa_web") @map("client_platform")
  submissionSource       String                 @default("online") @map("submission_source") // online | offline_synced
  offlineCreatedAt       DateTime?              @map("offline_created_at")

  restaurantId           String                 @map("restaurant_id")
  menuItemId             String?                @map("menu_item_id")
  dishId                 String?                @map("dish_id")

  allergenIds            String[]               @default([]) @map("allergen_ids")
  profileSnapshot        Json                   @map("profile_snapshot")
  recommendationSnapshot Json?                  @map("recommendation_snapshot")

  ateHere                Boolean?               @map("ate_here")
  visitedAt              DateTime?              @map("visited_at")
  askedStaff             Boolean?               @map("asked_staff")
  staffAnswer            StaffAnswer?           @map("staff_answer")
  staffAnswerText        String?                @map("staff_answer_text") @db.Text

  reaction               FeedbackReaction
  reactionTiming         FeedbackReactionTiming? @map("reaction_timing")
  userTrustRating        Int?                   @map("user_trust_rating")
  notes                  String?                @db.Text

  status                 FeedbackReportStatus   @default(needs_review)
  priority               FeedbackPriority       @default(normal)
  severeAutoFlagged      Boolean                @default(false) @map("severe_auto_flagged")

  reviewedAt             DateTime?              @map("reviewed_at")
  reviewedBy             String?                @map("reviewed_by")
  reviewOutcome          String?                @map("review_outcome")
  adminSummary           String?                @map("admin_summary") @db.Text

  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt

  restaurant             Restaurant             @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  menuItem               MenuItem?              @relation(fields: [menuItemId], references: [id], onDelete: SetNull)
  dish                   Dish?                  @relation(fields: [dishId], references: [id], onDelete: SetNull)
  flags                  FeedbackFlag[]
  actions                FeedbackAdminAction[]

  @@index([restaurantId, createdAt])
  @@index([menuItemId, createdAt])
  @@index([dishId, createdAt])
  @@index([status, priority, createdAt])
}
```

3. **`FeedbackFlag` model** — append after `FeedbackReport`:
```prisma
model FeedbackFlag {
  id              String             @id @default(cuid())
  reportId        String?            @map("report_id")
  entityType      FeedbackEntityType @map("entity_type")
  entityId        String             @map("entity_id")
  restaurantId    String?            @map("restaurant_id")
  menuItemId      String?            @map("menu_item_id")
  dishId          String?            @map("dish_id")
  allergenId      String?            @map("allergen_id")
  effect          FeedbackFlagEffect
  status          FeedbackFlagStatus @default(active)
  priority        FeedbackPriority   @default(normal)
  reason          String             @db.Text
  publicReasonKey String?            @map("public_reason_key")
  confidenceDelta Float?             @map("confidence_delta")
  readinessCap    String?            @map("readiness_cap")
  expiresAt       DateTime?          @map("expires_at")
  resolvedAt      DateTime?          @map("resolved_at")
  resolvedBy      String?            @map("resolved_by")
  adminNote       String?            @map("admin_note") @db.Text
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  report          FeedbackReport?    @relation(fields: [reportId], references: [id], onDelete: SetNull)
  actions         FeedbackAdminAction[]

  @@index([entityType, entityId, status])
  @@index([restaurantId, status])
  @@index([menuItemId, status])
  @@index([dishId, status])
  @@index([allergenId, status])
}
```

4. **`FeedbackAdminAction` model** — append after `FeedbackFlag`:
```prisma
model FeedbackAdminAction {
  id         String                  @id @default(cuid())
  reportId   String                  @map("report_id")
  flagId     String?                 @map("flag_id")
  actionType FeedbackAdminActionType @map("action_type")
  actor      String // "admin" | "system"
  note       String?                 @db.Text
  before     Json?
  after      Json?
  createdAt  DateTime                @default(now())

  report     FeedbackReport          @relation(fields: [reportId], references: [id], onDelete: Cascade)
  flag       FeedbackFlag?           @relation(fields: [flagId], references: [id], onDelete: SetNull)

  @@index([reportId, createdAt])
  @@index([flagId, createdAt])
}
```

5. **Back-relations** — add one line to each existing model's relation block (Prisma requires the reverse side):
   - `Restaurant` (after `menuItems MenuItem[]`, `:242`): `feedbackReports FeedbackReport[]`
   - `MenuItem` (after `allergenStatuses MenuItemAllergenStatus[]`, `:280`): `feedbackReports FeedbackReport[]`
   - `Dish` (after `allergenRisks DishAllergenRisk[]`, `:155`): `feedbackReports FeedbackReport[]`

6. **Validate** the schema before migrating:
   `pnpm --filter web exec prisma validate`  (or `pnpm --filter web prisma:generate` if that script exists).

7. **Generate migration** (needs DB reachable + `DIRECT_URL` set — run against the local/dev Postgres, not the pooled URL):
   `pnpm --filter web exec prisma migrate dev --name phase03_feedback_loop`
   This creates `apps/web/prisma/migrations/<ts>_phase03_feedback_loop/migration.sql` and regenerates the client.

8. **Audit the generated SQL** — confirm it is additive-only: `CREATE TYPE` for the 9 enums, `CREATE TABLE` for the 3 tables, `CREATE INDEX`, `ADD CONSTRAINT ... FOREIGN KEY`. It must NOT contain `DROP` or `ALTER COLUMN ... TYPE` against existing tables. Confirm `allergen_ids` is `TEXT[]` and `profile_snapshot` is `JSONB`.

9. **Client compile check** — `pnpm --filter web typecheck` to confirm the regenerated Prisma client types (`prisma.feedbackReport` etc.) are available for later phases.

## Todo List
- [ ] Add 9 feedback enums after `Strictness` (snake_case, verbatim).
- [ ] Add `FeedbackReport` model (FK→`MenuItem`, `clientReportId @unique`, `allergenIds String[]`, `@map` all fields).
- [ ] Add `FeedbackFlag` model (scalar entity ids, 5 indexes).
- [ ] Add `FeedbackAdminAction` model (2 indexes).
- [ ] Add `feedbackReports FeedbackReport[]` to `Restaurant`, `MenuItem`, `Dish`.
- [ ] `prisma validate` passes.
- [ ] Run `prisma migrate dev --name phase03_feedback_loop` (DIRECT_URL).
- [ ] Audit generated migration.sql = additive-only; `allergen_ids TEXT[]`, `profile_snapshot JSONB`.
- [ ] `pnpm --filter web typecheck` green (regenerated client).

## Success Criteria
- **DoD:** schema has 9 enums + 3 models + 3 back-relations; a new migration folder exists and applies cleanly on a fresh DB (`prisma migrate deploy` from empty → success); `prisma generate` yields `prisma.feedbackReport`, `prisma.feedbackFlag`, `prisma.feedbackAdminAction` delegates.
- **Validate:** (1) `prisma validate` OK. (2) `prisma migrate deploy` on a scratch DB replays all migrations without error. (3) `typecheck` green. (4) `grep` the new migration.sql for `DROP`/`ALTER COLUMN` → no hits on existing tables. (5) Every business column in the 3 tables has a snake_case column name; `createdAt`/`updatedAt` remain camelCase columns (matches `MenuItemAllergenStatus`).

## Risk Assessment
- **FK named `RestaurantMenuItem` (spec) does not exist → migration fails.** Mitigation: use `MenuItem` everywhere (delta already applied above).
- **Forgetting a back-relation → `prisma validate` errors ("missing opposite relation").** Mitigation: Step 5 adds all three; validate in Step 6 before migrating.
- **Migrate run against pooled `DATABASE_URL` (pgbouncer) can fail advisory locks.** Mitigation: `DIRECT_URL` is declared in datasource; ensure `.env` has it set to the direct Postgres port before running.
- **Accidentally enum-ifying an existing free-text column** (e.g. `verificationStatus`) — would be a destructive `ALTER`. Mitigation: this phase adds only new tables/enums; explicitly do not touch existing columns (Step 8 audit).
- **Non-additive migration slips in** (e.g. shadow-DB reset diff). Mitigation: Step 8 SQL audit; keep it a single `CREATE`-only file.

## Security & Privacy Considerations
- **Minimal snapshot (§2.3):** `profileSnapshot` schema is enforced in Zod at the API boundary (phase-03), but the DB column is `Json` — it must only ever receive `{allergies:[{allergenId,severity,crossContactSensitive}], dietaryProfiles:[]}`. No full store dump, no PII, no auth tokens.
- **No location fields:** deliberately no `lat`/`lon`/`distance`/`geo` columns on any feedback table — feedback is never geo-tagged (reality map §5).
- **Anonymous by default:** no user-id/email column; `reviewedBy`/`resolvedBy`/`actor` hold admin/system markers only, never end-user identity.
- **Free-text is `@db.Text`** but length-limiting is a Zod/UI responsibility (phase-03) — the DB does not cap length; do not rely on it.
- **`clientReportId @unique`** is the idempotency/dedup guard that later prevents duplicate-submission spam without exposing anything sensitive.

## Next Steps
- Unblocks [[phase-03-public-feedback-api]] — `planFeedbackReport`/`persistFeedbackReport` `$transaction`, idempotent create, `loadActiveFeedbackFlags` query.
- Unblocks [[phase-04-recommendation-integration]] — reading `FeedbackFlag WHERE status=active` → `FeedbackSignal`.
- Unblocks the admin-actions service (`FeedbackAdminAction` before/after snapshots) and the offline queue (which persists `clientReportId` client-side then replays into this table).
