// Menu-item allergy evaluator (spec §7.2–§7.4). Pure, deterministic, framework-free.
// Reuses the dish engine's ALLERGY_TABLE / STATUS_RANK / conservative logic so restaurant
// menu items are graded on the same scale as the dish guide.

import {
  ALLERGY_TABLE,
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
  STATUS_RANK,
} from './constants';
import { copy } from './copy';
import { MENU_ASK_ACTION, MENU_UNKNOWN_COPY } from './restaurant-constants';
import { downgradeConfidence, isStale, toDate } from './staleness';
import type {
  Bilingual,
  ConfidenceLabel,
  RecommendationStatus,
  RiskLevel,
  Severity,
} from './types';
import type {
  EvaluateMenuItemInput,
  MenuItemAllergenStatusLike,
  MenuItemRecommendation,
} from './restaurant-types';

interface Evaluation {
  status: RecommendationStatus;
  riskLevel: RiskLevel;
  confidence: number;
  reason: Bilingual;
  action: Bilingual;
  source: string;
  lastCheckedAt?: string | null;
  verified: boolean;
}

function isConservative(severity: Severity, cross: boolean | 'not_sure'): boolean {
  return severity === 'severe' || severity === 'anaphylaxis_risk' || cross === true || cross === 'not_sure';
}

function mapConfidence(confidence: number, isUnknown: boolean): ConfidenceLabel {
  if (isUnknown) return 'low';
  if (confidence >= CONFIDENCE_HIGH) return 'high';
  if (confidence >= CONFIDENCE_MEDIUM) return 'medium';
  return 'low';
}

// Evidence priority (§7.3): admin_verified > restaurant_submitted > official_menu/admin_manual
// > user_report > dish_inferred. Combines the explicit `source` with its `verificationStatus`.
function statusPriority(s: MenuItemAllergenStatusLike): number {
  if (s.verificationStatus === 'admin_verified') return 5;
  if (s.verificationStatus === 'restaurant_submitted' || s.source === 'restaurant_submitted') return 4;
  if (s.source === 'official_menu' || s.source === 'admin_manual') return 3;
  if (s.source === 'user_report') return 2;
  return 1; // dish_inferred / other
}

function selectHighest(evals: Evaluation[]): Evaluation | undefined {
  let best: Evaluation | undefined;
  for (const e of evals) {
    if (!best || STATUS_RANK[e.status] > STATUS_RANK[best.status]) best = e;
  }
  return best;
}

function explicitEvaluation(
  status: MenuItemAllergenStatusLike,
  conservative: boolean,
): Evaluation {
  const cell = ALLERGY_TABLE[status.riskLevel];
  const mapped = cell[conservative ? 'conservative' : 'normal'];
  const verified =
    status.verificationStatus === 'admin_verified' || status.verificationStatus === 'restaurant_submitted';
  return {
    status: mapped,
    riskLevel: status.riskLevel,
    confidence: status.confidence,
    reason: status.reason,
    action: status.action ?? MENU_UNKNOWN_COPY.action,
    source: status.source,
    lastCheckedAt: status.lastVerifiedAt ?? null,
    verified,
  };
}

export function evaluateMenuItem(input: EvaluateMenuItemInput): MenuItemRecommendation {
  const { menuItem, explicitAllergenStatuses, matchedDishRecommendation, profile, menuStatus } = input;
  const now = input.now ?? new Date();

  const evals: Evaluation[] = [];
  let anyAllergenUncovered = false;

  for (const allergy of profile.allergies) {
    const conservative = isConservative(allergy.severity, allergy.crossContactSensitive);
    const matches = explicitAllergenStatuses
      .filter((s) => s.allergenId === allergy.allergenId)
      .sort((a, b) => statusPriority(b) - statusPriority(a));
    const top = matches[0];
    if (top) {
      evals.push(explicitEvaluation(top, conservative));
    } else {
      anyAllergenUncovered = true;
    }
  }

  // Mapped dish inference (evidence tier 4): the aggregate safety net for allergens with no
  // explicit status, or the sole evidence when the item has no explicit statuses at all.
  const menuVerified = menuStatus === 'admin_verified' || menuStatus === 'restaurant_submitted';
  const needsFallback = anyAllergenUncovered || evals.length === 0;
  if (matchedDishRecommendation && needsFallback) {
    evals.push({
      status: matchedDishRecommendation.status,
      riskLevel: matchedDishRecommendation.riskLevel,
      confidence: labelToScore(matchedDishRecommendation.confidence),
      reason: matchedDishRecommendation.reason,
      action: matchedDishRecommendation.action,
      source: 'dish_inferred',
      lastCheckedAt: matchedDishRecommendation.lastCheckedAt ?? null,
      verified: menuVerified,
    });
  } else if (needsFallback) {
    // Uncovered allergen(s) with no dish inference must resolve to an honest Unknown —
    // never silently omitted (a missing eval could let another Suitable allergen win).
    evals.push({
      status: 'unknown',
      riskLevel: 'unknown',
      confidence: 0,
      reason: MENU_UNKNOWN_COPY.reason,
      action: MENU_UNKNOWN_COPY.action,
      source: 'engine',
      lastCheckedAt: menuItem.observedAt ?? null,
      verified: false,
    });
  }

  const selected = selectHighest(evals) as Evaluation;

  // §7.4: an item can only be called Suitable when the evidence is verified enough.
  // Unverified low-risk evidence (incl. all dish inference) is capped at Ask First.
  let status = selected.status;
  let action = selected.action;
  if (status === 'suitable' && !selected.verified) {
    status = 'ask_first';
    action = MENU_ASK_ACTION;
  }

  const isUnknownRisk = status === 'unknown' || selected.riskLevel === 'unknown';
  let confidence = mapConfidence(selected.confidence, isUnknownRisk);

  const staleFlag = isStale(toDate(selected.lastCheckedAt ?? undefined), selected.source, now);
  if (staleFlag) confidence = downgradeConfidence(confidence);

  // Suitable always carries the confirm-with-staff caveat (§2.2).
  if (status === 'suitable') {
    action = { en: copy.en.suitableCaveat, vi: copy.vi.suitableCaveat };
  }

  // Safety invariant (§2.2): unknown risk must never be reported Suitable.
  if (status === 'suitable' && evals.some((e) => e.status === 'unknown')) {
    throw new Error('Invariant violated: unknown menu-item risk resolved to suitable');
  }

  return {
    menuItemId: menuItem.menuItemId,
    restaurantId: menuItem.restaurantId,
    dishId: menuItem.dishId ?? null,
    displayName: menuItem.displayName,
    status,
    riskLevel: selected.riskLevel,
    confidence,
    confidenceScore: selected.confidence,
    source: selected.source,
    reason: selected.reason,
    action,
    lastCheckedAt: selected.lastCheckedAt ?? null,
    stale: staleFlag,
    matchedDishName: matchedDishRecommendation?.matchedDishName ?? null,
  };
}

function labelToScore(label: ConfidenceLabel): number {
  return label === 'high' ? 0.85 : label === 'medium' ? 0.65 : 0.3;
}
