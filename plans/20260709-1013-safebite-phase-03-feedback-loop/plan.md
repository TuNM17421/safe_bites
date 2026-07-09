# SafeBite Travel — Phase 03: Feedback Loop (Implementation Plan)

**Spec:** `docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md` · **Created:** 2026-07-09 · **Status:** Planned (not started)

Add a structured post-meal feedback loop on top of the Phase 02 Restaurant MVP:
`recommendation → user eats/asks staff → structured feedback → severe reports escalate →
admin review → active flags conservatively influence recommendations`. Risk reduction, not
risk elimination. User reports never become automatic verification.

## Ground truth (read first)

- `research/codebase-reality-map.md` — what the code actually is (9-subsystem map + spec-assumption deltas).
- `research/interface-contract.md` — canonical names/paths/decisions every phase uses. Its **"Cross-phase reconciliations"** section is authoritative and supersedes any conflicting phase-file text (severeAutoFlagged stored, feedbackSummary built by route, admin may show notes, admin-list `meta` shape, etc.).

**Key deltas the spec got wrong:** menu model is `MenuItem` (not `RestaurantMenuItem`); domain returns
`MenuItemRecommendation`/`RestaurantRecommendation` (not `*Evaluation`); status literals are snake_case;
no `profileAllergenIds` var (derive it); admin cookie is `sbt_admin` via `requireAdmin`; **the `quality`
CI job has no DB** so feedback logic must be unit-testable without Prisma (DB integration → e2e).

## Phases

| # | Phase | Depends on | Status |
|---|---|---|---|
| 01 | [Domain feedback core (schemas, signals, apply-logic) + unit tests](phase-01-domain-feedback-core.md) | — | ✅ Done — merged to `main` (41 tests; gate green under Next 16) |
| 02 | [Prisma models, enums, migration, relations](phase-02-prisma-persistence.md) | 01 | ✅ Done (schema + additive migration; gate green; CI applies it) |
| 03 | [Public feedback API (submit + options) + server services](phase-03-public-feedback-api.md) | 01, 02 | ✅ Done (review: SHIP; gate green; DB round-trip + migrations verified) |
| 04 | [Recommendation integration (flags → signals → apply → feedbackSummary)](phase-04-recommendation-integration.md) | 01, 02, 03 | ✅ Done (gate green; live pipeline smoke: cap C→D, allergen-scoped) |
| 05 | [Admin feedback API (list/detail/patch/actions + audit)](phase-05-admin-feedback-api.md) | 02, 03 | ✅ Done (gate green; live admin-action smoke: full side-effect + audit trail) |
| 06 | [Public feedback UX (form, routes, CTAs, badges, i18n)](phase-06-public-feedback-ux.md) | 03, 04 | ☐ Not started |
| 07 | [Offline feedback queue + foreground sync](phase-07-offline-queue-sync.md) | 03, 06 | ☐ Not started |
| 08 | [Admin feedback UI (queue/detail/actions/audit + nav)](phase-08-admin-feedback-ui.md) | 05 | ☐ Not started |
| 09 | [Seed demo, tests (domain/unit/e2e), README, quality gate](phase-09-seed-tests-docs.md) | all | ☐ Not started |

Order follows spec §23 ("domain/schema/API before UI — a beautiful table backed by broken trust
logic is just a spreadsheet wearing perfume"). Phases 04/05 and 06/07/08 can partly parallelize once
01–03 land.

## Key dependencies & risks

- **Domain-first**: all trust logic lives in `packages/domain` (framework-free, unit-tested with no DB). Server/API only orchestrates + persists.
- **Backward-compatible responses**: `feedbackSummary` is additive (no output Zod schema exists); existing UI/tests must not break when absent.
- **Idempotency**: `clientReportId @unique` + find-or-create in a transaction (offline sync retries safely).
- **CI split**: keep new vitest tests DB-free (`quality` job); cover real POST/admin/recommendation-impact in `e2e` (needs a new admin-login e2e helper + `seed:feedback-demo` step).
- **copy:check**: new EN/VI copy must dodge the denylist and spec §11.6 forbidden phrases; optionally strengthen the guard.
- **Privacy**: minimal `profileSnapshot`; never store geolocation in feedback; never expose raw notes publicly; profile never in URL.

## Definition of done (spec §22)

Public can submit feedback without an account (online or queued offline, synced later); severe/anaphylaxis
auto-urgent + auto-flagged; active flags conservatively downgrade/suppress/cap recommendations; positive
reports never upgrade; admin can review/resolve/dismiss with a full audit trail; recommendation APIs never
leak raw notes; profile never in URL; Phase 0/1/2 flows still pass; `quality` + `e2e` gates green; README updated.
