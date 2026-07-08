import { PrismaClient } from '@prisma/client';

// CI/e2e fixture only. The importer marks seeded dishes + risks `needs_review`; the public
// recommendation path serves `approved` rows only. Approve everything so the §17.2 happy path
// has visible, risk-bearing dishes. Never run against a real review workflow.
const prisma = new PrismaClient();

async function main() {
  const dishes = await prisma.dish.updateMany({ data: { reviewStatus: 'approved' } });
  const risks = await prisma.dishAllergenRisk.updateMany({ data: { reviewStatus: 'approved' } });
  console.log(`approved: dishes=${dishes.count} risks=${risks.count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
