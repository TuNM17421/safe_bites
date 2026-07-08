import { buildQuestionCard, questionCardRequestSchema, type LocalUserProfile } from '@safebite/domain';
import { apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// §9.6 — deterministic bilingual restaurant question card (no LLM).
export async function POST(req: Request) {
  const parsed = await parseBody(req, questionCardRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { profile: p, dishId, menuItemId, targetLanguage } = parsed.data;

  const profile: LocalUserProfile = {
    id: p.id,
    selectedProfileIds: p.selectedProfileIds,
    allergies: p.allergies,
    language: p.language,
    destinationCity: p.destinationCity ?? '',
    safetyAcceptedAt: '',
    offlineEnabled: false,
    createdAt: '',
    updatedAt: '',
  };

  const allergenIds = p.allergies.map((a) => a.allergenId);
  const rows = allergenIds.length
    ? await prisma.allergen.findMany({ where: { id: { in: allergenIds } } })
    : [];
  const allergens = rows.map((a) => ({
    id: a.id,
    nameVi: a.nameVi,
    nameEn: a.nameEn,
    aliasesVi: a.aliasesVi,
    aliasesEn: a.aliasesEn,
  }));

  // Resolve the item name to name in the ingredient question: a specific menu item takes
  // precedence over a mapped dish (§15 menu context). Name lookup only — no allergy data.
  let dishName: { en: string; vi: string } | undefined;
  if (menuItemId) {
    const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (item) dishName = { en: item.nameEn ?? item.rawName, vi: item.nameVi ?? item.rawName };
  }
  if (!dishName && dishId) {
    const dish = await prisma.dish.findUnique({ where: { id: dishId } });
    if (dish) dishName = { en: dish.canonicalNameEn, vi: dish.canonicalNameVi };
  }

  const card = buildQuestionCard({ profile, allergens, targetLanguage, dishName });

  return apiOk({
    id: `qc_${crypto.randomUUID()}`,
    targetLanguage: card.targetLanguage,
    source: 'template_generated',
    createdAt: new Date().toISOString(),
    text: card.text,
    sections: card.sections,
  });
}
