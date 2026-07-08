import { Prisma, PrismaClient } from '@prisma/client';
import { ALLERGEN_CATALOG } from '@safebite/domain';
import { slugId } from '../src/features/admin/admin-serializers';
import { DEMO_RESTAURANTS, type DemoRiskLevel } from './seed/data/demo-menu';

// Phase 02 (spec §10.3) demo menu seed. DEV/DEMO ONLY — attaches a small curated set of menu
// items (mapped to existing dishes) to labeled synthetic demo restaurants so the restaurant
// flow and e2e have real, risk-bearing data. Never randomized, never real-business impersonation.
//
// Not part of seed:kit or CI. Refuses to run in production unless explicitly allowed.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('Refusing to run the demo menu seed in production (set ALLOW_DEMO_SEED=true to override).');
  process.exit(1);
}

const prisma = new PrismaClient();
const TX_OPTS = { maxWait: 20_000, timeout: 120_000 } as const;
// Fixed observation date so re-runs are byte-identical (no Date.now()).
const OBSERVED_AT = new Date('2026-07-01T00:00:00.000Z');

const ALLERGEN_NAME: Record<string, { en: string; vi: string }> = Object.fromEntries(
  ALLERGEN_CATALOG.map((a) => [a.id, { en: a.nameEn.toLowerCase(), vi: a.nameVi.toLowerCase() }]),
);

const CONFIDENCE: Record<DemoRiskLevel, number> = {
  contains: 0.9,
  likely_contains: 0.8,
  possible: 0.5,
  unlikely: 0.5,
  unknown: 0.4,
};

// Conservative bilingual reasons built from a template (denylist-safe: no "safe"/"guaranteed").
function reason(level: DemoRiskLevel, allergenId: string): { en: string; vi: string } {
  const n = ALLERGEN_NAME[allergenId] ?? { en: allergenId, vi: allergenId };
  switch (level) {
    case 'contains':
      return { en: `This item usually contains ${n.en}.`, vi: `Món này thường có ${n.vi}.` };
    case 'likely_contains':
      return { en: `This item likely contains ${n.en}.`, vi: `Món này có thể có ${n.vi}.` };
    case 'possible':
      return {
        en: `This item may contain ${n.en} depending on preparation.`,
        vi: `Món này có thể chứa ${n.vi} tùy cách chế biến.`,
      };
    case 'unlikely':
      return {
        en: `This item does not usually contain ${n.en}, but preparation is not verified.`,
        vi: `Món này thường không có ${n.vi}, nhưng cách chế biến chưa được xác minh.`,
      };
    default:
      return {
        en: `We cannot confirm ${n.en} for this item. Ask staff before ordering.`,
        vi: `Không thể xác nhận ${n.vi} cho món này. Hãy hỏi nhân viên trước khi gọi món.`,
      };
  }
}

// Backfill a unique slug for any restaurant missing one (deterministic: name slug + id suffix).
async function backfillSlugs(tx: Prisma.TransactionClient): Promise<number> {
  const missing = await tx.restaurant.findMany({
    where: { slug: null },
    select: { id: true, canonicalName: true },
  });
  for (const r of missing) {
    const base = slugId(r.canonicalName, 'rest');
    await tx.restaurant.update({ where: { id: r.id }, data: { slug: `${base}_${r.id.slice(-6)}` } });
  }
  return missing.length;
}

async function seed(tx: Prisma.TransactionClient) {
  let restaurants = 0;
  let items = 0;
  let statuses = 0;

  for (const r of DEMO_RESTAURANTS) {
    const restaurantData = {
      externalSource: 'manual_seed' as const,
      slug: r.slug,
      canonicalName: r.canonicalName,
      nameEn: r.nameEn,
      nameVi: r.nameVi,
      amenity: 'restaurant',
      cuisineRaw: r.cuisineRaw,
      cuisineNormalized: r.cuisineNormalized,
      fullAddress: r.fullAddress,
      district: r.district,
      city: r.city,
      country: 'Vietnam',
      lat: new Prisma.Decimal(r.lat),
      lon: new Prisma.Decimal(r.lon),
      sourceObservedAt: OBSERVED_AT,
      dataLicense: 'demo',
      attributionRequired: false,
      menuStatus: r.menuStatus,
      verificationStatus: r.verificationStatus,
      reviewStatus: 'approved' as const,
      notes: 'Demo seed data (Phase 02) — not a real business.',
    };
    await tx.restaurant.upsert({
      where: { id: r.id },
      create: { id: r.id, ...restaurantData },
      update: restaurantData,
    });
    restaurants += 1;

    for (const m of r.menuItems) {
      const itemData = {
        restaurantId: r.id,
        dishId: m.dishId,
        rawName: m.rawName,
        nameEn: m.nameEn,
        nameVi: m.nameVi,
        section: m.section ?? null,
        menuSourceType: 'manual_seed',
        observedAt: OBSERVED_AT,
        parsedBy: 'manual',
        menuStatus: m.menuStatus,
        sharedCookware: m.sharedCookware ?? 'unknown',
        sharedFryer: m.sharedFryer ?? 'unknown',
        canCustomize: m.canCustomize ?? 'unknown',
        notes: 'Demo seed data (Phase 02).',
      };
      await tx.menuItem.upsert({
        where: { id: m.id },
        create: { id: m.id, ...itemData },
        update: itemData,
      });
      items += 1;

      for (const a of m.allergens) {
        const text = reason(a.riskLevel, a.allergenId);
        const statusData = {
          riskLevel: a.riskLevel,
          confidence: new Prisma.Decimal(CONFIDENCE[a.riskLevel]),
          source: 'admin_manual',
          reasonEn: text.en,
          reasonVi: text.vi,
          lastVerifiedAt: OBSERVED_AT,
          verificationStatus: a.verificationStatus ?? m.menuStatus,
        };
        await tx.menuItemAllergenStatus.upsert({
          where: { menuItemId_allergenId: { menuItemId: m.id, allergenId: a.allergenId } },
          create: { menuItemId: m.id, allergenId: a.allergenId, ...statusData },
          update: statusData,
        });
        statuses += 1;
      }
    }
  }
  return { restaurants, items, statuses };
}

async function main() {
  const slugged = await prisma.$transaction((tx) => backfillSlugs(tx), TX_OPTS);
  console.log(`  slugs backfilled: ${slugged}`);

  const result = await prisma.$transaction((tx) => seed(tx), TX_OPTS);
  console.log(
    `  demo restaurants=${result.restaurants} menuItems=${result.items} allergenStatuses=${result.statuses}`,
  );

  await prisma.importRun.create({
    data: {
      sourceName: 'restaurant-demo-menu',
      sourcePath: 'scripts/seed/data/demo-menu.ts',
      status: 'success',
      rowsRead: result.items,
      rowsInserted: result.items,
      rowsUpdated: 0,
      rowsSkipped: 0,
      errors: Prisma.DbNull,
      finishedAt: new Date(),
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
