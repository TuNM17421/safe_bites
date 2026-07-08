import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';

// pnpm runs this with cwd = apps/web, but `--kit` paths in the spec are written relative
// to the repo root. Resolve relative kit paths against the repo root (three levels up
// from apps/web/scripts) so `pnpm seed:kit -- --kit ./osm_overpass_seed_kit` works.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
import { parseCsv, type CsvRow } from './seed/csv';
import { deriveAllergenRows, upsertAllergens } from './seed/allergens';
import { importDishes } from './seed/import-dishes';
import { importIngredients } from './seed/import-ingredients';
import { importProfiles } from './seed/import-profiles';
import { importRestaurants } from './seed/import-restaurants';
import { newCounts, type Counts } from './seed/types';

const prisma = new PrismaClient();
let hadFailure = false;

// Interactive-transaction options. Prisma's defaults (5s timeout, 2s maxWait) are fine for
// a local DB but too tight for a remote target (Neon): each file imports rows with sequential
// findUnique+upsert round-trips, which exceed 5s over network latency. Generous limits let the
// one-off seed complete against a remote DB without changing local behaviour.
const TX_OPTS = { maxWait: 20_000, timeout: 120_000 } as const;

function parseArgs(): { kit: string } {
  const args = process.argv.slice(2);
  const i = args.indexOf('--kit');
  const raw = i >= 0 && args[i + 1] ? args[i + 1]! : './osm_overpass_seed_kit';
  return { kit: isAbsolute(raw) ? raw : resolve(REPO_ROOT, raw) };
}

async function writeImportRun(name: string, path: string, status: string, counts: Counts, error?: unknown) {
  await prisma.importRun.create({
    data: {
      sourceName: name,
      sourcePath: path,
      status,
      rowsRead: counts.read,
      rowsInserted: counts.inserted,
      rowsUpdated: counts.updated,
      rowsSkipped: counts.skipped,
      errors: error === undefined ? Prisma.DbNull : ({ message: String(error) } as Prisma.InputJsonValue),
      finishedAt: new Date(),
    },
  });
}

async function runFile(
  name: string,
  path: string,
  importer: (db: Prisma.TransactionClient, rows: CsvRow[]) => Promise<Counts>,
): Promise<Counts> {
  if (!existsSync(path)) {
    console.log(`  ${name}: file not found -> skipped`);
    await writeImportRun(name, path, 'skipped', newCounts());
    return newCounts();
  }
  let rows: CsvRow[];
  try {
    rows = parseCsv(path);
  } catch (error) {
    hadFailure = true;
    console.error(`  ${name}: parse error -> ${String(error)}`);
    await writeImportRun(name, path, 'failed', newCounts(), error);
    return newCounts();
  }
  if (rows.length === 0) {
    console.log(`  ${name}: header-only -> skipped`);
    await writeImportRun(name, path, 'skipped', newCounts());
    return newCounts();
  }
  try {
    const counts = await prisma.$transaction((tx) => importer(tx, rows), TX_OPTS);
    console.log(
      `  ${name}: read=${counts.read} inserted=${counts.inserted} updated=${counts.updated} skipped=${counts.skipped}`,
    );
    await writeImportRun(name, path, 'success', counts);
    return counts;
  } catch (error) {
    hadFailure = true;
    console.error(`  ${name}: import failed -> ${String(error)}`);
    await writeImportRun(name, path, 'failed', newCounts(), error);
    return newCounts();
  }
}

async function main() {
  const { kit } = parseArgs();
  console.log(`Seeding from kit: ${kit}`);

  const profiles = await runFile('profiles', join(kit, 'schemas/profiles.csv'), importProfiles);

  let allergenTags: string[] = [];
  const ingredients = await runFile(
    'ingredients',
    join(kit, 'outputs/starter_ingredients_sample.csv'),
    async (tx, rows) => {
      const result = await importIngredients(tx, rows);
      allergenTags = result.tags;
      return result.counts;
    },
  );

  const allergenRows = deriveAllergenRows(allergenTags);
  await prisma.$transaction((tx) => upsertAllergens(tx, allergenRows), TX_OPTS);
  console.log(`  allergens: upserted=${allergenRows.length}`);

  let riskCounts = newCounts();
  const dishes = await runFile('dishes', join(kit, 'outputs/starter_dishes_hanoi_sample.csv'), async (tx, rows) => {
    const result = await importDishes(tx, rows);
    riskCounts = result.risks;
    return result.dishes;
  });
  console.log(`  dish_allergen_risks: read=${riskCounts.read} inserted=${riskCounts.inserted} updated=${riskCounts.updated}`);

  await runFile('restaurants', join(kit, 'outputs/restaurants_osm_raw.csv'), importRestaurants);

  for (const rel of [
    'schemas/dish_ingredients_schema.csv',
    'schemas/risk_rules_schema.csv',
    'schemas/menu_items_schema.csv',
  ]) {
    console.log(`  ${rel}: schema definition -> skipped`);
    await writeImportRun('schema', join(kit, rel), 'skipped', newCounts());
  }

  console.log('--- Summary ---');
  console.log(`Profiles imported: ${profiles.inserted + profiles.updated}`);
  console.log(`Ingredients imported: ${ingredients.inserted + ingredients.updated}`);
  console.log(`Dishes imported: ${dishes.inserted + dishes.updated}`);
  console.log(`DishAllergenRisk generated: ${riskCounts.inserted + riskCounts.updated}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    if (hadFailure) process.exit(1);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
