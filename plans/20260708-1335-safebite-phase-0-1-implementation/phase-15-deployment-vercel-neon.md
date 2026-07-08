# Phase 15 — Deployment: Vercel (app) + Neon (Postgres + PostGIS)

## Context Links

- Decisions/report: `reports/spec-gap-decisions-and-risks.md` — **ADR-008** (Vercel + Neon), **R16** (serverless Prisma connection/pooling). Also ADR-002 (monorepo in place → Vercel root dir), ADR-005/open-Q4 (strong prod `ADMIN_TOKEN`), ADR-006 (Decimal→number, unaffected).
- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md` §2 (single deployable web app; PostgreSQL+PostGIS; Prisma), §4.1 `.env.example`, §4.2 docker (dev only), §5 schema + PostGIS init migration.
- Depends on:
  - `phase-03-database-prisma-schema-and-migrations.md` — Prisma schema, PostGIS init migration, and the `datasource` with `url` **+ `directUrl`** (ADR-008 delta).
  - `phase-13-tests-copy-guard-and-ci.md` — CI green (typecheck/lint/test/copy:check/e2e) as the deploy gate.
- **Priority/placement:** **P2, additive, off critical path** (like phase-14). Deploy after Phase-0/1 runs locally and CI is green. **Not** part of the §21 local-run DoD.

## Overview

- **Current status:** ✅ Artifacts done — verified 2026-07-08. Shipped the repo-side deliverables: **`docs/deployment.md`** (full runbook — Neon Singapore setup, pooled vs direct URL, Vercel Root Directory `apps/web` + env vars, migrate-on-deploy, one-time prod seed + dish approval, preview branches, rollback/PITR, security, troubleshooting), **`apps/web/vercel.json`** (`buildCommand: prisma generate && prisma migrate deploy && next build`, framework nextjs), and a README **Deployment** section linking the runbook. Verified (no re-add): `datasource.directUrl = env("DIRECT_URL")` already in `schema.prisma` (phase-03), `DIRECT_URL` already documented in `.env.example`, schema has 9 models. `vercel.json` is valid JSON; `copy:check`/`typecheck` stay green. **Note:** the live cloud **provisioning** (create the Neon project, Vercel project, set env/secrets, first deploy + prod seed, enable the Neon↔Vercel preview integration, smoke `/api/health`) is an **operator task executed by following the runbook** — it needs Neon/Vercel credentials and is out of scope for the repo. Skipped the optional `.github/workflows/deploy.yml` (YAGNI — Vercel's build command runs the migrate; the runbook documents the CI-driven alternative). `db:deploy` already exists as a root script, so it was not duplicated into `apps/web/package.json`.
- **Brief description:** Stand up production on **Vercel** (Next.js RSC + `/api` serverless functions) and **Neon** (serverless Postgres + PostGIS). Wire the pooled/direct connection strings, env vars, migrate-on-deploy, a one-time prod seed, region co-location (Singapore), and the Neon↔Vercel preview-branch integration. No app-code/data-model changes beyond the phase-03 `directUrl` datasource delta.

## Key Insights

1. **Pooled vs direct URL is the crux (R16).** `DATABASE_URL` = Neon **pooled** endpoint (`-pooler` host, `?sslmode=require&pgbouncer=true`) for the serverless app; `DIRECT_URL` = Neon **direct** endpoint (`?sslmode=require`) for `prisma migrate`. The `datasource` declares both (phase-03). Migrating against the pooled/PgBouncer endpoint can fail — always migrate on the direct URL.
2. **PostGIS on Neon is supported.** The init migration's `CREATE EXTENSION IF NOT EXISTS postgis` runs during `migrate deploy` (direct URL). No separate provisioning needed beyond confirming it applied.
3. **No server-side PII in Phase 1.** The prod DB holds only the content catalog + restaurants (hidden). Low compliance surface; Neon free tier is ample for the pilot. Accounts/sync (server-side user data) would be a Phase-2 revisit.
4. **Monorepo deploy (ADR-002).** Vercel **Root Directory = `apps/web`**; pnpm workspace build bundles `packages/domain`. No app restructure.
5. **Region co-location.** Put Neon + Vercel functions in **Singapore (`ap-southeast-1`)** — closest to Hanoi users; avoids per-request cross-region DB latency.
6. **Preview branches for free.** The Neon↔Vercel native integration auto-creates a Neon **branch per preview deployment** and injects env — isolated preview data, no manual wiring.
7. **Migrations are a deploy step, not `next build` alone.** Run `prisma migrate deploy` (direct URL) at build/deploy; seed prod once. Never ship data in the image (dev data lives only in the local Docker volume).

## Requirements

### Functional

1. Neon project + database with PostGIS (Singapore region); capture **pooled** + **direct** connection strings.
2. Vercel project from the monorepo (**Root Directory `apps/web`**); env vars set for all environments.
3. Build/deploy runs `prisma generate` + `prisma migrate deploy` (direct URL) → all 9 tables + `postgis` on Neon.
4. One-time prod seed via `DIRECT_URL`: `db:seed` (14 allergens) + `seed:kit` (OSM content). `seed:openmap` stays manual/optional (ADR-007).
5. `/api/health` returns `db:ok` against Neon; the app is reachable on the Vercel URL.
6. Neon↔Vercel integration enabled for preview branches (recommended).

### Non-functional

- Secrets only in Vercel env / Neon; never committed. `.env.example` documents `DIRECT_URL` (local = `DATABASE_URL`).
- Pooled endpoint (`pgbouncer=true`) at runtime; direct endpoint for migrations; region co-located.
- Strong `ADMIN_TOKEN` in prod (not `change-me-in-dev`). TLS everywhere (`sslmode=require`; Vercel HTTPS by default).
- Rollback path: Vercel deploy rollback + Neon branch/PITR.

## Related Code Files

### To create
- `docs/deployment.md` — runbook: Neon setup, Vercel env, migrate, seed, region, preview branches, rollback.
- `.github/workflows/deploy.yml` — **optional**; only if migrations are CI-driven rather than in the Vercel build command.

### To modify
- `apps/web/prisma/schema.prisma` — `datasource` gains `directUrl = env("DIRECT_URL")` (authored in phase-03 per ADR-008; **verify** here, do not re-add).
- `.env.example` — add `DIRECT_URL` (local = `DATABASE_URL`) with a comment.
- `apps/web/package.json` — add `"db:deploy": "prisma migrate deploy"`; set Vercel build command to `prisma generate && prisma migrate deploy && next build` (or move migrate to CI).
- `README.md` (root) — link `docs/deployment.md`.

### To delete
- None.

## Implementation Steps

1. **Neon.** Create a project in **Singapore**; create the DB. Copy the **pooled** (`...-pooler...`) and **direct** connection strings, both with `?sslmode=require`. (PostGIS is applied by our init migration; verify after step 5.)
2. **Vercel.** Import the repo; set **Root Directory = `apps/web`**; framework auto-detects Next.js; package manager pnpm.
3. **Env vars** (Vercel → Settings → Environment Variables, all envs): `DATABASE_URL` = pooled (`...-pooler...?sslmode=require&pgbouncer=true`), `DIRECT_URL` = direct (`?sslmode=require`), `ADMIN_TOKEN` = strong value (open-Q4), `NEXT_PUBLIC_*` per §4.1. (`OPENMAP_API_KEY` only on an ops box if running `seed:openmap` — not needed on Vercel.)
4. **Datasource.** Confirm phase-03 shipped `datasource db { url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`. If missing → fix phase-03 (no migration added here).
5. **Build/migrate.** Set the Vercel build command to `prisma generate && prisma migrate deploy && next build` (migrate uses `DIRECT_URL`), OR run `prisma migrate deploy` in a CI step before promoting. Verify all 9 tables + `postgis` exist on Neon.
6. **Prod seed (once).** From an ops shell with `DIRECT_URL` set: `pnpm db:seed` then `pnpm seed:kit -- --kit ./osm_overpass_seed_kit`. Confirm counts (allergens = 14, dishes > 0, `DishAllergenRisk` = 110). Restaurants stay hidden (§1.3).
7. **Preview branches.** Enable the Neon↔Vercel integration so each PR preview gets its own Neon branch + env.
8. **Verify prod.** Hit the Vercel URL; `/api/health` → `db:ok`; onboarding → dishes → question-card flows work; confirm no restaurant surface; `copy:check` already gates in CI.

## Todo List

- [ ] Neon project (Singapore) + DB; capture pooled + direct URLs
- [ ] Vercel project, Root Directory = `apps/web`, pnpm build
- [ ] Env vars: `DATABASE_URL` (pooled, `pgbouncer=true`), `DIRECT_URL` (direct), strong `ADMIN_TOKEN`, `NEXT_PUBLIC_*`
- [x] Confirm `datasource.directUrl` (phase-03); add `DIRECT_URL` to `.env.example` — both already present
- [ ] Build runs `prisma generate` + `migrate deploy`; verify 9 tables + `postgis` on Neon
- [ ] One-time prod seed (`db:seed` + `seed:kit`) via `DIRECT_URL`; verify counts
- [ ] Enable Neon↔Vercel preview-branch integration
- [ ] Smoke prod: `/api/health` `db:ok`, core flows, no restaurant surface
- [x] Write `docs/deployment.md` runbook + `apps/web/vercel.json` build command + README link

## Success Criteria

- App live on Vercel; `/api/health` returns `{status:"ok", db:"ok"}` against Neon.
- `prisma migrate deploy` created all 9 tables + `postgis`; prod seed counts match P0-04.
- Runtime uses the **pooled** URL (no connection exhaustion under load); migrations use the **direct** URL.
- Each preview deploy gets an isolated Neon branch.
- Strong `ADMIN_TOKEN` in prod (not the dev default); no secrets in the repo.
- No Phase-1 restaurant UX; `copy:check` green in CI.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Pooled/direct URL mixup, connection exhaustion, PgBouncer-incompatible migrations (R16) | Prod outage / failed migrate | `DATABASE_URL` pooled (`pgbouncer=true`), `DIRECT_URL` direct for `migrate`; `datasource.directUrl` from phase-03 |
| PostGIS not enabled on Neon | `migrate deploy` fails | Neon supports `postgis`; init migration `CREATE EXTENSION IF NOT EXISTS`; verify in step 5 |
| Migrations attempted in `next build` without DB reachability | Build fails | Neon is always-on/serverless-reachable at build; or move `migrate deploy` to a CI step |
| Weak default `ADMIN_TOKEN` shipped (open-Q4) | Admin console exposed | Strong token in Vercel env; runbook mandates override |
| Cross-region latency (DB far from functions) | Slow requests | Co-locate Neon + Vercel in Singapore |
| Serverless cold starts | First-request latency | Acceptable for pilot; pooled connection cuts connect cost; revisit if needed |
| Seed/migrate run against pooled URL | Quirks/failures | Always `db:seed`/`migrate deploy` via `DIRECT_URL` |

## Security Considerations

- **Secrets:** `DATABASE_URL`/`DIRECT_URL`/`ADMIN_TOKEN` live only in Vercel env + Neon; `.env` git-ignored; `.env.example` carries placeholders only. `/api/health` never echoes the connection string (phase-03).
- **No server PII (Phase 1):** prod DB has no user data (local-first) → reduced breach surface. Revisit when accounts/sync land (Phase 2 → Neon RLS or app-level authz).
- **Admin hardening:** strong `ADMIN_TOKEN` in prod (ADR-005/open-Q4); httpOnly cookie + constant-time compare (phase-12).
- **Discovery-only preserved:** OSM/OpenMap restaurants stay `unverified`, license/attribution retained, no Phase-1 surface (unchanged). OpenMap ToS gate (R14/open-Q8) still applies before any Phase-2 surfacing.
- **Transport:** `sslmode=require` on both URLs; Vercel serves HTTPS by default.

## Next Steps

- **Unblocks:** a live pilot URL for the Hanoi test; Phase-2 object storage (menu photos) picks Vercel Blob or S3/R2 then (deferred, YAGNI).
- **Open items:** strong `ADMIN_TOKEN` value (open-Q4); OpenMap ToS before any Phase-2 restaurant surfacing (open-Q8/R14); confirm the Neon plan tier + whether compute autosuspend (cold start) is acceptable for the pilot.
