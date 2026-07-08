import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';
import { parseCsv, type CsvRow } from './seed/csv';
import { importOpenmapRestaurants } from './seed/import-openmap-restaurants';
import { newCounts, type Counts } from './seed/types';

// Opt-in OpenMap.vn discovery importer (ADR-007) — NOT part of `seed:kit` / CI.
//   pnpm seed:openmap -- --kit ./openmap_seed_kit        (default file: <kit>/restaurants.csv)
//   pnpm seed:openmap -- --file ./openmap_seed_kit/restaurants_openmap_live.csv
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const prisma = new PrismaClient();
// Generous tx limits for a possibly-remote (Neon) target — same rationale as seed:kit.
const TX_OPTS = { maxWait: 20_000, timeout: 120_000 } as const;

function resolveFile(): string {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0 && args[fileIdx + 1]) {
    const f = args[fileIdx + 1]!;
    return isAbsolute(f) ? f : resolve(REPO_ROOT, f);
  }
  const kitIdx = args.indexOf('--kit');
  const kit = kitIdx >= 0 && args[kitIdx + 1] ? args[kitIdx + 1]! : './openmap_seed_kit';
  const kitAbs = isAbsolute(kit) ? kit : resolve(REPO_ROOT, kit);
  return join(kitAbs, 'restaurants.csv');
}

async function writeRun(path: string, status: string, counts: Counts, error?: unknown) {
  await prisma.importRun.create({
    data: {
      sourceName: 'openmap',
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

async function main() {
  const path = resolveFile();
  console.log(`OpenMap restaurant import: ${path}`);
  if (!existsSync(path)) {
    console.log('  file not found -> skipped');
    await writeRun(path, 'skipped', newCounts());
    return;
  }
  let rows: CsvRow[];
  try {
    rows = parseCsv(path);
  } catch (error) {
    await writeRun(path, 'failed', newCounts(), error);
    throw error;
  }
  if (rows.length === 0) {
    console.log('  header-only -> skipped');
    await writeRun(path, 'skipped', newCounts());
    return;
  }
  try {
    const counts = await prisma.$transaction((tx) => importOpenmapRestaurants(tx, rows), TX_OPTS);
    await writeRun(path, 'success', counts);
    console.log(`  read=${counts.read} inserted=${counts.inserted} updated=${counts.updated} skipped=${counts.skipped}`);
    console.log(`Restaurants (openmap) imported: ${counts.inserted + counts.updated}`);
  } catch (error) {
    await writeRun(path, 'failed', newCounts(), error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
