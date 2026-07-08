import type { DishRecommendationCard } from '@safebite/domain';
import { GROUP_KEY } from '@/components/status/status-visuals';
import { savedDishRepo } from '@/lib/local-repo';
import type { Recommendations } from './dishes-client';

// Persist a successful recommendation fetch to Dexie for offline reads (§11.2 — the
// recommendation response is never SW-cached; this is an explicit local write).
export async function persistCards(cards: DishRecommendationCard[]): Promise<void> {
  for (const card of cards) await savedDishRepo.saveDish(card);
}

// Rebuild the grouped/summary shape from saved cards. Statuses are preserved verbatim —
// unknown-status cards are never dropped or upgraded.
export async function loadSavedRecommendations(city: string): Promise<Recommendations> {
  const all = await savedDishRepo.loadSavedDishes();
  const groups: Recommendations['groups'] = { suitable: [], askFirst: [], risky: [], avoid: [], unknown: [] };
  for (const card of all) groups[GROUP_KEY[card.status]].push(card);
  return {
    city,
    groups,
    summary: {
      total: all.length,
      suitable: groups.suitable.length,
      askFirst: groups.askFirst.length,
      risky: groups.risky.length,
      avoid: groups.avoid.length,
      unknown: groups.unknown.length,
    },
  };
}
