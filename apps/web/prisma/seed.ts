import { ALLERGEN_CATALOG } from '@safebite/domain';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
