import {
  evaluateDishes,
  recommendationRequestSchema,
  type DishRecommendationCard,
  type LocalUserProfile,
} from '@safebite/domain';
import { apiOk, parseBody } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { dishToEvaluationInput, statusToGroupKey, type RecommendationGroupKey } from '@/lib/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// §9.5 — evaluate approved dishes for a city against the posted local profile.
export async function POST(req: Request) {
  const parsed = await parseBody(req, recommendationRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { city, language, profile: p } = parsed.data;

  const profile: LocalUserProfile = {
    id: p.id,
    selectedProfileIds: p.selectedProfileIds,
    allergies: p.allergies,
    language,
    destinationCity: p.destinationCity ?? city,
    safetyAcceptedAt: '',
    offlineEnabled: false,
    createdAt: '',
    updatedAt: '',
  };

  const dishes = await prisma.dish.findMany({
    where: { regionTags: { has: city }, reviewStatus: 'approved' },
    include: { allergenRisks: true },
    orderBy: { id: 'asc' },
  });

  const cards = evaluateDishes(profile, dishes.map(dishToEvaluationInput));
  const groups: Record<RecommendationGroupKey, DishRecommendationCard[]> = {
    suitable: [],
    askFirst: [],
    risky: [],
    avoid: [],
    unknown: [],
  };
  for (const card of cards) groups[statusToGroupKey(card.status)].push(card);

  const summary = {
    total: cards.length,
    suitable: groups.suitable.length,
    askFirst: groups.askFirst.length,
    risky: groups.risky.length,
    avoid: groups.avoid.length,
    unknown: groups.unknown.length,
  };

  return apiOk({ city, groups, summary });
}
