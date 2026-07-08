// Restaurant readiness evaluator (spec §7.5/§7.6). Deterministic A–E grading with hard caps
// so discovery-only / unverified data can never look strongly recommended.

import {
  DISCOVERY_ONLY_SUMMARY,
  READINESS_SUMMARY,
  STALE_REASON,
} from './restaurant-constants';
import { downgradeConfidence, isStale, toDate } from './staleness';
import type { ConfidenceLabel } from './types';
import type {
  EvaluateRestaurantReadinessInput,
  MenuItemRecommendation,
  RestaurantLike,
  RestaurantReadinessClass,
  RestaurantRecommendation,
  RestaurantRecommendationCounts,
} from './restaurant-types';

const CLASS_RANK: Record<RestaurantReadinessClass, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

function classFromRank(rank: number): RestaurantReadinessClass {
  return rank >= 5 ? 'A' : rank === 4 ? 'B' : rank === 3 ? 'C' : rank === 2 ? 'D' : 'E';
}
const DISCOVERY_SOURCES = ['openstreetmap', 'openmapvn'];
const EXPLICIT_SOURCES = ['admin_manual', 'restaurant_submitted', 'official_menu', 'user_report'];

function countStatuses(recs: MenuItemRecommendation[]): RestaurantRecommendationCounts {
  const counts = { suitable: 0, askFirst: 0, risky: 0, avoid: 0, unknown: 0, total: recs.length };
  for (const r of recs) {
    if (r.status === 'suitable') counts.suitable += 1;
    else if (r.status === 'ask_first') counts.askFirst += 1;
    else if (r.status === 'risky') counts.risky += 1;
    else if (r.status === 'avoid') counts.avoid += 1;
    else counts.unknown += 1;
  }
  return counts;
}

function baseClass(
  counts: RestaurantRecommendationCounts,
  restaurant: RestaurantLike,
): RestaurantReadinessClass {
  const { suitable, askFirst, risky, avoid, total } = counts;
  const bad = avoid + risky;
  const positive = suitable + askFirst;
  if (total === 0) return 'C';
  if (bad === total) return 'E';
  if (bad > positive) return 'D';
  if (
    suitable >= 1 &&
    restaurant.verificationStatus === 'admin_verified' &&
    restaurant.menuStatus === 'admin_verified' &&
    avoid === 0 &&
    risky === 0
  ) {
    return 'A';
  }
  if (positive >= 1) return 'B';
  return 'C';
}

function verificationSourceKey(restaurant: RestaurantLike): string {
  const v = restaurant.verificationStatus;
  if (v === 'admin_verified') return 'admin_verified';
  if (v === 'restaurant_confirmed' || v === 'restaurant_contacted') return 'restaurant_submitted';
  return restaurant.externalSource;
}

export function evaluateRestaurantReadiness(
  input: EvaluateRestaurantReadinessInput,
): RestaurantRecommendation {
  const { restaurant, menuRecommendations } = input;
  const now = input.now ?? new Date();
  const counts = countStatuses(menuRecommendations);

  const hasExplicitEvidence = menuRecommendations.some((r) => EXPLICIT_SOURCES.includes(r.source));
  const hasDishInference = menuRecommendations.some((r) => r.source === 'dish_inferred');
  const hasMappingEvidence = hasExplicitEvidence || hasDishInference;
  const discoverySource = DISCOVERY_SOURCES.includes(restaurant.externalSource);
  const discoveryOnly =
    !restaurant.hasMenuItems || counts.total === 0 || (discoverySource && !hasMappingEvidence);

  // ---- Hard caps (§7.6): compute the best rank the evidence permits ----
  let capRank = CLASS_RANK.A;
  if (counts.total === 0) capRank = Math.min(capRank, CLASS_RANK.C); // no menu items
  if (!hasMappingEvidence) capRank = Math.min(capRank, CLASS_RANK.C); // no allergen/dish mapping
  if (discoveryOnly) capRank = Math.min(capRank, CLASS_RANK.C); // OSM/OpenMap discovery only
  if (!hasExplicitEvidence && hasDishInference) capRank = Math.min(capRank, CLASS_RANK.B); // dish-inferred only
  if (restaurant.verificationStatus === 'expired') capRank = Math.min(capRank, CLASS_RANK.B);
  if (restaurant.verificationStatus === 'flagged') capRank = Math.min(capRank, CLASS_RANK.D);

  // ---- Confidence ----
  let confidence: ConfidenceLabel;
  if (discoveryOnly || counts.total === 0 || !hasMappingEvidence) confidence = 'low';
  else if (restaurant.verificationStatus === 'admin_verified' && restaurant.menuStatus === 'admin_verified')
    confidence = 'high';
  else confidence = 'medium';

  if (restaurant.verificationStatus === 'expired') confidence = downgradeConfidence(confidence);

  const stale = isStale(toDate(restaurant.lastCheckedAt ?? undefined), verificationSourceKey(restaurant), now);
  if (stale) confidence = downgradeConfidence(confidence);

  // ---- Final class ----
  let rank = Math.min(CLASS_RANK[baseClass(counts, restaurant)], capRank);
  // A requires high confidence; demote if the evidence isn't strong enough.
  if (rank === CLASS_RANK.A && confidence !== 'high') rank = CLASS_RANK.B;
  const readinessClass = classFromRank(rank);

  const reasons = [];
  if (stale) reasons.push(STALE_REASON);

  return {
    restaurantId: restaurant.restaurantId,
    readinessClass,
    confidence,
    counts,
    summary: discoveryOnly ? DISCOVERY_ONLY_SUMMARY : READINESS_SUMMARY[readinessClass],
    reasons,
    source: restaurant.externalSource,
    verificationStatus: restaurant.verificationStatus,
    menuStatus: restaurant.menuStatus,
    lastCheckedAt: restaurant.lastCheckedAt ?? null,
    stale,
  };
}
