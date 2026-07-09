// Phase 03 — apply active feedback signals to a base recommendation (spec §11.3–§11.5).
// Conservative only: signals may make a recommendation MORE cautious, never less. A Suitable
// status is never produced from feedback; unknown is never upgraded.
//
// IMPORTANT (§11 ordering): restaurant readiness must be computed from the BASE (pre-feedback)
// menu recommendations. `applyFeedbackSignalsToMenuItem` rewrites `source` to the review marker,
// so feeding its output back into the readiness evaluator would corrupt evidence detection.
// Apply both functions to the base results independently.

import { CONFIDENCE_HIGH, CONFIDENCE_MEDIUM, STATUS_RANK } from '../constants';
import {
  FEEDBACK_UNDER_REVIEW_REASON,
  FEEDBACK_UNDER_REVIEW_SOURCE,
  FEEDBACK_UNDER_REVIEW_SUMMARY,
  MENU_ASK_ACTION,
} from '../restaurant-constants';
import { downgradeConfidence } from '../staleness';
import type { ConfidenceLabel, RecommendationStatus } from '../types';
import type {
  MenuItemRecommendation,
  RestaurantReadinessClass,
  RestaurantRecommendation,
} from '../restaurant-types';
import {
  feedbackSignalWeight,
  signalMatchesProfile,
  signalTargetsMenuItem,
  signalTargetsRestaurant,
  type FeedbackSignal,
} from './signals';

const CLASS_RANK: Record<RestaurantReadinessClass, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };
function classFromRank(rank: number): RestaurantReadinessClass {
  return rank >= 5 ? 'A' : rank === 4 ? 'B' : rank === 3 ? 'C' : rank === 2 ? 'D' : 'E';
}

// Never let a rewrite lower caution (§2.2 monotonic-caution). Since candidates are only ever
// more cautious, this also guarantees feedback never yields `suitable`.
function mostCautious(a: RecommendationStatus, b: RecommendationStatus): RecommendationStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

// Keep the numeric confidenceScore consistent with the downgraded label (finding #2): clamp it
// just below the next band's floor so mapConfidence(score) never exceeds the label.
const SCORE_EPS = 0.01;
function clampScoreToLabel(score: number, label: ConfidenceLabel): number {
  if (label === 'low') return Math.min(score, CONFIDENCE_MEDIUM - SCORE_EPS);
  if (label === 'medium') return Math.min(score, CONFIDENCE_HIGH - SCORE_EPS);
  return score;
}

// §11.4/§11.5. Downgrades/suppresses a matching menu item; leaves already-cautious items alone.
export function applyFeedbackSignalsToMenuItem(input: {
  recommendation: MenuItemRecommendation;
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  severityByAllergen?: Record<string, string>;
  now?: Date | string;
}): MenuItemRecommendation {
  const { recommendation: rec, profileAllergenIds, severityByAllergen, now } = input;
  const ref = { menuItemId: rec.menuItemId, dishId: rec.dishId, restaurantId: rec.restaurantId };

  const matched = input.signals.filter(
    (s) =>
      signalTargetsMenuItem(s, ref) &&
      signalMatchesProfile(s, profileAllergenIds) &&
      feedbackSignalWeight({ createdAt: s.createdAt, now, priority: s.priority, status: s.status }) > 0,
  );
  if (matched.length === 0) return { ...rec };

  const suppress = matched.some(
    (s) => s.effect === 'suppress_suitable' || s.effect === 'hide_recommendation',
  );
  const downgrade = matched.some((s) => s.effect === 'downgrade_confidence');
  if (!suppress && !downgrade) return { ...rec }; // e.g. only a restaurant-level cap targets us

  // Severe context: any urgent signal, a matched scoped allergen that is severe/anaphylaxis, or
  // (for an unscoped signal) any severe/anaphylaxis allergy in the viewing profile (finding #3).
  const profileHasSevere =
    !!severityByAllergen &&
    Object.values(severityByAllergen).some((s) => s === 'severe' || s === 'anaphylaxis_risk');
  const severe =
    matched.some((s) => s.priority === 'urgent') ||
    matched.some((s) => {
      const sev = s.allergenId ? severityByAllergen?.[s.allergenId] : undefined;
      return sev === 'severe' || sev === 'anaphylaxis_risk';
    }) ||
    (matched.some((s) => s.allergenId == null) && profileHasSevere);

  let status = rec.status;
  let action = rec.action;
  let reason = rec.reason;
  let source = rec.source;

  // §11.4: only a Suitable item flips status and loses its now-stale reassuring copy. Items that
  // are already cautious keep their hazard reason+action (finding #1) — the under-review state is
  // surfaced via the source marker, the lower confidence, and the aggregate feedbackSummary banner.
  if (suppress && rec.status === 'suitable') {
    status = severe ? 'risky' : 'ask_first';
    action = MENU_ASK_ACTION;
  }
  if (rec.status === 'suitable') {
    reason = FEEDBACK_UNDER_REVIEW_REASON;
  }
  source = FEEDBACK_UNDER_REVIEW_SOURCE;
  const confidence = downgradeConfidence(rec.confidence);
  const confidenceScore = clampScoreToLabel(rec.confidenceScore, confidence);

  // Monotonic guard: never end less cautious than the base status.
  status = mostCautious(status, rec.status);

  return { ...rec, status, confidence, confidenceScore, reason, action, source };
}

// §11.3. Caps readiness to the most conservative active cap; appends a review reason and
// lowers confidence. Never raises readiness; E stays E.
export function applyFeedbackSignalsToRestaurantReadiness(input: {
  recommendation: RestaurantRecommendation;
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  severityByAllergen?: Record<string, string>;
  now?: Date | string;
}): RestaurantRecommendation {
  const { recommendation: rec, profileAllergenIds, now } = input;

  const matched = input.signals.filter(
    (s) =>
      (s.effect === 'cap_restaurant_readiness' ||
        s.effect === 'flag_for_review' ||
        s.effect === 'downgrade_confidence') &&
      signalTargetsRestaurant(s, rec.restaurantId) &&
      signalMatchesProfile(s, profileAllergenIds) &&
      feedbackSignalWeight({ createdAt: s.createdAt, now, priority: s.priority, status: s.status }) > 0,
  );
  if (matched.length === 0) return { ...rec };

  // Most conservative cap = lowest CLASS_RANK across all matching caps and the current class.
  let rank = CLASS_RANK[rec.readinessClass];
  for (const s of matched) {
    if (s.effect === 'cap_restaurant_readiness') {
      rank = Math.min(rank, CLASS_RANK[s.readinessCap ?? 'D']);
    }
  }
  const readinessClass = classFromRank(rank);

  // Append the review reason once; lower confidence one level.
  const reasons = [...rec.reasons, FEEDBACK_UNDER_REVIEW_SUMMARY];
  const confidence = downgradeConfidence(rec.confidence);

  return { ...rec, readinessClass, confidence, reasons };
}
