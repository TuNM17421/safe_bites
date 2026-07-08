# Deployment — Vercel (app) + Neon (Postgres + PostGIS)

Production runbook for SafeBite Travel (ADR-008). The app is a single Next.js deployable on
**Vercel** (RSC + `/api` serverless functions); the database is **Neon** (serverless Postgres +
PostGIS). Co-locate both in **Singapore (`ap-southeast-1`)** — closest to the Hanoi pilot users.

> Phase 1 is **local-first**: the production DB holds only the content catalog (allergens,
> dishes, risks) and hidden restaurant rows — **no user PII**. Profiles live in the browser.

---

## 0. Prerequisites

- Repo access + a Vercel account and a Neon account.
- The repo builds and CI is green locally (`pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check`).
- A strong production `ADMIN_TOKEN` (not the dev `change-me-in-dev`) — e.g. `openssl rand -hex 32`.

## 1. Neon — database (Singapore)

1. Create a Neon **project** in region **AWS `ap-southeast-1` (Singapore)**; note the database name
   (default `neondb`).
2. From the project's **Connection Details**, copy **both** connection strings:
   - **Pooled** — host contains `-pooler`, used at runtime by the serverless app. Ensure it ends with
     `?sslmode=require&pgbouncer=true`.
   - **Direct** — no `-pooler`, used by `prisma migrate`. Ends with `?sslmode=require`.
3. PostGIS needs **no manual provisioning** — the init migration runs
   `CREATE EXTENSION IF NOT EXISTS postgis` during `migrate deploy` (step 4). Neon supports it.

```
DATABASE_URL = postgresql://<user>:<pw>@<host>-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL   = postgresql://<user>:<pw>@<host>.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **Why two URLs (R16):** the serverless runtime must use the **pooled** (PgBouncer) endpoint or it
> exhausts connections under load; `prisma migrate` must use the **direct** endpoint because
> PgBouncer rejects the migration protocol. `prisma/schema.prisma` already declares both:
> `datasource db { url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`.

## 2. Vercel — project

1. **Import** the Git repository into Vercel.
2. **Root Directory = `apps/web`** (ADR-002 — monorepo built in place; the pnpm workspace bundles
   `packages/domain`). Framework auto-detects **Next.js**; package manager **pnpm**.
3. The build command + migrate step are pinned in `apps/web/vercel.json`
   (`prisma generate && prisma migrate deploy && next build`) — no dashboard override needed.
4. Set the **function region** to Singapore (`sin1`) to co-locate with Neon.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set for **Production**, **Preview**, and **Development** (values differ per environment for the DB
URLs if you use preview branches — see step 6):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL (`...-pooler...?sslmode=require&pgbouncer=true`) |
| `DIRECT_URL` | Neon **direct** URL (`?sslmode=require`) |
| `ADMIN_TOKEN` | **strong** random secret (never `change-me-in-dev`) |
| `NEXT_PUBLIC_APP_NAME` | `SafeBite Travel` |
| `NEXT_PUBLIC_DEFAULT_CITY` | `hanoi` |
| `NEXT_PUBLIC_SUPPORTED_CITIES` | `hanoi,da_nang,hoi_an` |
| `NEXT_PUBLIC_SUPPORTED_LANGUAGES` | `en,vi` |
| `OFFLINE_CACHE_TTL_DAYS` | `7` |
| `PWA_INSTALL_ENABLED` | `true` |

`OPENMAP_API_KEY` is **not** needed on Vercel — `seed:openmap` (ADR-007) runs only from an ops box.
Secrets live **only** in Vercel/Neon; `.env` is git-ignored and `.env.example` carries placeholders.

## 4. Build & migrate

The Vercel build runs `prisma generate && prisma migrate deploy && next build`
(`apps/web/vercel.json`). `migrate deploy` uses `DIRECT_URL` and applies the init migration →
all **9 tables** + the `postgis` extension on Neon.

**Verify** after the first deploy (from an ops shell with `DIRECT_URL` exported):

```bash
pnpm --filter @safebite/web exec prisma migrate status   # "Database schema is up to date"
psql "$DIRECT_URL" -c "\dt"                               # 9 tables
psql "$DIRECT_URL" -c "SELECT PostGIS_full_version();"    # extension present
```

> **Alternative (CI-driven migrate):** if you prefer to decouple migration from the build, drop the
> `prisma migrate deploy` from `vercel.json`'s `buildCommand`, run `pnpm db:deploy` (root script →
> `prisma migrate deploy`) in a CI job with `DIRECT_URL` set **before** promoting the Vercel deploy,
> and keep the build command as `prisma generate && next build`.

## 5. One-time production seed

Seed base + kit content **once**, against the **direct** URL, from an ops shell:

```bash
export DATABASE_URL="$DIRECT_URL"   # seed scripts should hit the direct endpoint
export DIRECT_URL="$DIRECT_URL"
pnpm db:seed                                       # 14 allergens + 6 profile templates
pnpm seed:kit -- --kit ./osm_overpass_seed_kit     # dishes + generated DishAllergenRisk
```

Expected counts (P0-04): **allergens = 14**, **dishes > 0**, **`DishAllergenRisk` = dishes × 10**
(e.g. 31 dishes → 310 rows). Restaurants import as `unverified` and stay **hidden** in Phase-1 UX.

### Make dishes visible

Seeded dishes import as `needs_review`; the public recommendation path serves **`approved`** rows
only, so `/dishes` is empty until they are approved. Either:

- **Curate in the admin console** (`/admin`, authenticated with `ADMIN_TOKEN`) — the intended path; or
- **Bulk-approve for the pilot** from an ops shell:
  `pnpm --filter @safebite/web exec tsx scripts/approve-seed-content.ts` (sets every dish + risk to
  `approved`). Use only for a demo/pilot, not a real review workflow.

## 6. Preview branches (recommended)

Enable the **Neon ↔ Vercel** native integration so each PR **preview** deploy gets its **own Neon
branch** with auto-injected `DATABASE_URL`/`DIRECT_URL` — isolated preview data, no manual wiring.
The Phase-13 CI e2e job seeds its own throwaway PostGIS, so previews and CI stay independent.

## 7. Smoke test production

- `GET https://<app>.vercel.app/api/health` → `{ "data": { "status": "ok", "db": "ok" } }`.
- Onboarding → `/home` (no profile data in the URL) → `/dishes` shows grouped cards →
  open a dish → **Generate question card** → copy → `/allergy-card` shows "Available offline".
- Confirm **no restaurant surface** anywhere; `pnpm copy:check` is already a CI gate.

## Rollback

- **App:** Vercel → Deployments → promote a previous deployment (instant).
- **Database:** Neon **branch** or **point-in-time restore** (PITR) to before a bad migration/seed.
  Never hand-edit prod rows to "undo" a migration — restore instead.

## Security notes

- **Secrets** (`DATABASE_URL`, `DIRECT_URL`, `ADMIN_TOKEN`) live only in Vercel env + Neon; nothing
  committed. `/api/health` never echoes the connection string.
- **No server PII** in Phase 1 (local-first) → minimal breach surface. Revisit when accounts/sync
  land (Phase 2 → Neon RLS or app-level authz).
- **Admin hardening:** strong `ADMIN_TOKEN` in prod (ADR-005); the admin session is an httpOnly
  cookie with a constant-time token compare (Phase 12).
- **Transport:** `sslmode=require` on both URLs; Vercel serves HTTPS by default.
- **Discovery-only:** OSM/OpenMap restaurants stay `unverified` with attribution retained and no
  Phase-1 surface. The OpenMap ToS gate (R14) applies before any Phase-2 restaurant surfacing.

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `migrate deploy` hangs / protocol error | Ran against the **pooled** URL → use `DIRECT_URL` |
| Runtime "too many connections" | Runtime using the **direct** URL → use the **pooled** (`pgbouncer=true`) URL |
| `type "geometry" does not exist` | PostGIS not applied → the init migration `CREATE EXTENSION` ran on the wrong DB; re-run `migrate deploy` on `DIRECT_URL` |
| `/dishes` empty in prod | Dishes still `needs_review` → approve (step 5) |
| `/api/health` `db:"error"` | Bad `DATABASE_URL`, wrong region, or Neon compute suspended (cold start) — retry / check the URL |
