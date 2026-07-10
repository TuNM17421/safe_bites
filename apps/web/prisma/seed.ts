import { ALLERGEN_CATALOG } from '@safebite/domain';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// v2: curated famous Hà Nội dishes for the /famous list, as [dishId, featuredRank]. Idempotent
// and additive — only flags dishes that already exist (imported by the seed:kit scripts); it
// never creates dishes. Missing IDs are skipped silently.
const FAMOUS_HANOI: Array<[string, number]> = [
  ['dish_pho_bo', 1],
  ['dish_bun_cha', 2],
  ['dish_pho_ga', 3],
  ['dish_bun_dau_mam_tom', 4],
  ['dish_cha_ca', 5],
  ['dish_banh_cuon', 6],
  ['dish_bun_thang', 7],
  ['dish_egg_coffee', 8],
];

// Baseline seed: the canonical Allergen catalog (single source of truth in
// @safebite/domain). Idempotent — re-running upserts, never duplicates. Phase 4's
// importer reconciles against these same IDs. No reason/action copy => §16-safe.
async function main() {
  for (const allergen of ALLERGEN_CATALOG) {
    await prisma.allergen.upsert({
      where: { id: allergen.id },
      update: { nameEn: allergen.nameEn, nameVi: allergen.nameVi },
      create: { id: allergen.id, nameEn: allergen.nameEn, nameVi: allergen.nameVi },
    });
  }
  console.log(`Allergens seeded: ${ALLERGEN_CATALOG.length}`);

  let famousCount = 0;
  for (const [id, featuredRank] of FAMOUS_HANOI) {
    const res = await prisma.dish.updateMany({ where: { id }, data: { isFamous: true, featuredRank } });
    famousCount += res.count;
  }
  console.log(`Famous dishes flagged: ${famousCount}/${FAMOUS_HANOI.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
