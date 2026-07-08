import type { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { adminRestaurantQuerySchema, restaurantCreateSchema } from '@/lib/admin-schemas';
import { adminRestaurantToDTO, slugId } from '@/features/admin/admin-serializers';
import { apiError, apiOk, parseBody, parseQuery } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = parseQuery(req.url, adminRestaurantQuerySchema);
  if (!q.ok) return q.response;
  const f = q.data;

  const where: Prisma.RestaurantWhereInput = {};
  if (f.review_status !== 'all') where.reviewStatus = f.review_status;
  if (f.needs_review === 'true') where.reviewStatus = 'needs_review';
  if (f.verification_status) where.verificationStatus = f.verification_status;
  if (f.menu_status) where.menuStatus = f.menu_status;
  if (f.city) where.city = f.city;
  if (f.district) where.district = f.district;
  if (f.source) where.externalSource = f.source;
  if (f.has_menu_items === 'true') where.menuItems = { some: {} };
  if (f.has_menu_items === 'false') where.menuItems = { none: {} };

  const rows = await prisma.restaurant.findMany({
    where,
    include: { _count: { select: { menuItems: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return apiOk(rows.map(adminRestaurantToDTO));
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await parseBody(req, restaurantCreateSchema);
  if (!body.ok) return body.response;
  const { id, slug, sourceObservedAt, ...rest } = body.data;
  try {
    const restaurant = await prisma.restaurant.create({
      data: {
        ...rest,
        id: id ?? slugId(rest.canonicalName, 'rest'),
        slug: slug ?? slugId(rest.canonicalName, 'rest'),
        sourceObservedAt: sourceObservedAt ?? new Date(),
      },
    });
    return apiOk(adminRestaurantToDTO(restaurant), { status: 201 });
  } catch (e) {
    if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      return apiError('CONFLICT', 'A restaurant with this id or slug already exists.', { status: 409 });
    }
    throw e;
  }
}
