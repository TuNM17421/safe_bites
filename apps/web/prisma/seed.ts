import { ALLERGEN_CATALOG } from '@safebite/domain';
import { PrismaClient, type SourceType } from '@prisma/client';

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

// v2 demo: a few per-restaurant ingredient rows for the demo Bún chả so /restaurant/:id/dish
// shows real provenance ("restaurant self-declared + 1 user contribution"). Idempotent; skips
// silently if the menu item or ingredient is absent (they come from the demo-menu seed script).
const DEMO_MENU_INGREDIENTS: Array<{
  menuItemId: string;
  ingredientId: string;
  source: SourceType;
  contributorType: string;
  verificationStatus: string;
}> = [
  { menuItemId: 'mi_demo_bun_cha', ingredientId: 'ing_fish_sauce', source: 'restaurant_submitted', contributorType: 'restaurant', verificationStatus: 'restaurant_submitted' },
  { menuItemId: 'mi_demo_bun_cha', ingredientId: 'ing_peanut', source: 'user_contribution', contributorType: 'user', verificationStatus: 'unverified' },
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

  let miCount = 0;
  for (const row of DEMO_MENU_INGREDIENTS) {
    const [mi, ing] = await Promise.all([
      prisma.menuItem.findUnique({ where: { id: row.menuItemId }, select: { id: true } }),
      prisma.ingredient.findUnique({ where: { id: row.ingredientId }, select: { id: true } }),
    ]);
    if (!mi || !ing) continue;
    const data = { source: row.source, contributorType: row.contributorType, verificationStatus: row.verificationStatus };
    await prisma.menuItemIngredient.upsert({
      where: { menuItemId_ingredientId: { menuItemId: row.menuItemId, ingredientId: row.ingredientId } },
      update: data,
      create: { menuItemId: row.menuItemId, ingredientId: row.ingredientId, ...data },
    });
    miCount += 1;
  }
  console.log(`Demo menu-item ingredients seeded: ${miCount}/${DEMO_MENU_INGREDIENTS.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
