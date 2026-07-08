import { apiError, apiOk } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { dishToDTO } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// §9.4 — single dish by id (404 enveloped when missing).
export async function GET(_req: Request, { params }: { params: Promise<{ dishId: string }> }) {
  const { dishId } = await params;
  const dish = await prisma.dish.findUnique({ where: { id: dishId }, include: { allergenRisks: true } });
  if (!dish) return apiError('NOT_FOUND', 'Dish not found.', { status: 404 });
  return apiOk(dishToDTO(dish));
}
