import { prisma } from '@/lib/db';
import type { OcrPrediction } from '@/lib/ocr-schemas';

// Persist an OCR prediction as a review item (needs_review). Photo is bounded; nothing verified.
export async function enqueueReviewItem(
  prediction: OcrPrediction,
  opts: { photo?: string | null; menuItemId?: string | null; restaurantId?: string | null },
): Promise<string> {
  const item = await prisma.ocrReviewItem.create({
    data: {
      dishGuessVi: prediction.dishName.vi,
      dishGuessEn: prediction.dishName.en,
      photoRef: opts.photo && opts.photo.length <= 900_000 ? opts.photo : null,
      menuItemId: opts.menuItemId ?? null,
      restaurantId: opts.restaurantId ?? null,
      ingredients: {
        create: prediction.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          rawName: ing.name.en,
          confidence: ing.confidence,
        })),
      },
    },
    select: { id: true },
  });
  return item.id;
}

// Apply an admin decision transactionally. Approve promotes each CHECKED ingredient that resolves
// to a catalog ingredient AND belongs to a known menu item into MenuItemIngredient
// (source=ocr, contributorType=ocr, verificationStatus=unverified — NEVER auto-verified), records
// per-ingredient decisions, and stamps the item reviewed. Reject writes no MenuItemIngredient.
export async function applyReviewDecision(
  itemId: string,
  decision: 'approve' | 'reject',
  approvedIngredientIds: string[],
  actor: string,
): Promise<{ promoted: number } | null> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.ocrReviewItem.findUnique({ where: { id: itemId }, include: { ingredients: true } });
    if (!item) return null;

    if (decision === 'reject') {
      await tx.ocrReviewIngredient.updateMany({ where: { itemId }, data: { decision: 'rejected' } });
      await tx.ocrReviewItem.update({ where: { id: itemId }, data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: actor } });
      return { promoted: 0 };
    }

    const approved = new Set(approvedIngredientIds);
    let promoted = 0;
    for (const ing of item.ingredients) {
      const isApproved = approved.has(ing.id);
      await tx.ocrReviewIngredient.update({ where: { id: ing.id }, data: { decision: isApproved ? 'approved' : 'rejected' } });
      if (isApproved && ing.ingredientId && item.menuItemId) {
        await tx.menuItemIngredient.upsert({
          where: { menuItemId_ingredientId: { menuItemId: item.menuItemId, ingredientId: ing.ingredientId } },
          update: { source: 'ocr', contributorType: 'ocr', verificationStatus: 'unverified' },
          create: { menuItemId: item.menuItemId, ingredientId: ing.ingredientId, source: 'ocr', contributorType: 'ocr', verificationStatus: 'unverified' },
        });
        promoted += 1;
      }
    }
    await tx.ocrReviewItem.update({ where: { id: itemId }, data: { status: 'approved', reviewedAt: new Date(), reviewedBy: actor } });
    return { promoted };
  });
}

export async function listPendingReviewItems() {
  const items = await prisma.ocrReviewItem.findMany({
    where: { status: 'needs_review' },
    include: {
      ingredients: { orderBy: { rawName: 'asc' } },
      menuItem: { select: { id: true, rawName: true, nameEn: true } },
      restaurant: { select: { id: true, canonicalName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return items.map((it) => ({
    id: it.id,
    dishGuess: { en: it.dishGuessEn, vi: it.dishGuessVi },
    photoRef: it.photoRef,
    menuItem: it.menuItem ? { id: it.menuItem.id, name: it.menuItem.nameEn ?? it.menuItem.rawName } : null,
    restaurant: it.restaurant ? { id: it.restaurant.id, name: it.restaurant.canonicalName } : null,
    ingredients: it.ingredients.map((ing) => ({
      id: ing.id,
      ingredientId: ing.ingredientId,
      rawName: ing.rawName,
      confidence: ing.confidence === null ? null : Number(ing.confidence),
    })),
    createdAt: it.createdAt.toISOString(),
  }));
}
