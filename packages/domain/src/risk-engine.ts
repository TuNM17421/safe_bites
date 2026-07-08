import {
  ALLERGY_TABLE,
  CALORIE_COPY,
  CALORIE_PROFILE_ID,
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
  CONSTRAINT_TABLE,
  CONSTRAINT_UNKNOWN_COPY,
  NO_CONSTRAINT_COPY,
  PICKY_COPY,
  PICKY_FLAGS,
  PICKY_PROFILE_ID,
  RELIGIOUS_CONSTRAINTS,
  RISK_LEVELS,
  STATUS_RANK,
  UNKNOWN_ALLERGEN_COPY,
} from './constants';
import { copy } from './copy';
import type {
  Bilingual,
  ConfidenceLabel,
  DishEvaluationInput,
  DishRecommendationCard,
  LocalUserProfile,
  RecommendationStatus,
  RiskLevel,
  Severity,
} from './types';
import { distinct } from './util';

interface Evaluation {
  status: RecommendationStatus;
  riskLevel: RiskLevel;
  confidence: number;
  reason: Bilingual;
  action: Bilingual;
  source: string;
  lastCheckedAt: string;
  allergenId?: string;
}

function normalizeRiskLevel(value: string): RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(value) ? (value as RiskLevel) : 'unknown';
}

function isConservative(severity: Severity, cross: boolean | 'not_sure'): boolean {
  return severity === 'severe' || severity === 'anaphylaxis_risk' || cross === true || cross === 'not_sure';
}

function dishLastChecked(dish: DishEvaluationInput): string {
  return dish.risks.reduce((acc, r) => (r.lastCheckedAt > acc ? r.lastCheckedAt : acc), '');
}

function evaluateAllergies(profile: LocalUserProfile, dish: DishEvaluationInput): Evaluation[] {
  return profile.allergies.map((allergy) => {
    const fact = dish.risks.find((r) => r.allergenId === allergy.allergenId);
    const riskLevel = fact ? normalizeRiskLevel(fact.riskLevel) : 'unknown';
    const conservative = isConservative(allergy.severity, allergy.crossContactSensitive);
    const status = ALLERGY_TABLE[riskLevel][conservative ? 'conservative' : 'normal'];
    return {
      status,
      riskLevel,
      confidence: fact ? fact.confidence : 0,
      reason: fact ? fact.reason : UNKNOWN_ALLERGEN_COPY.reason,
      action: fact ? fact.recommendedAction : UNKNOWN_ALLERGEN_COPY.action,
      source: fact ? fact.source : 'engine',
      lastCheckedAt: fact ? fact.lastCheckedAt : dishLastChecked(dish),
      allergenId: allergy.allergenId,
    };
  });
}

function evaluateReligious(profile: LocalUserProfile, dish: DishEvaluationInput): Evaluation[] {
  const evals: Evaluation[] = [];
  for (const profileId of profile.selectedProfileIds) {
    const constraints = RELIGIOUS_CONSTRAINTS[profileId];
    if (!constraints) continue;
    for (const allergenId of constraints) {
      const fact = dish.risks.find((r) => r.allergenId === allergenId);
      const riskLevel = fact ? normalizeRiskLevel(fact.riskLevel) : 'unknown';
      evals.push({
        status: CONSTRAINT_TABLE[riskLevel],
        riskLevel,
        confidence: fact ? fact.confidence : 0,
        reason: fact ? fact.reason : CONSTRAINT_UNKNOWN_COPY.reason,
        action: fact ? fact.recommendedAction : CONSTRAINT_UNKNOWN_COPY.action,
        source: fact ? fact.source : 'engine',
        lastCheckedAt: fact ? fact.lastCheckedAt : dishLastChecked(dish),
        allergenId,
      });
    }
  }
  return evals;
}

function evaluateCalorie(profile: LocalUserProfile, dish: DishEvaluationInput): Evaluation | null {
  if (!profile.selectedProfileIds.includes(CALORIE_PROFILE_ID)) return null;
  const cc = dish.calorieClass;
  const key = cc === 'high' ? 'high' : cc === 'medium' || cc === 'low' ? 'ok' : 'unknown';
  const status: RecommendationStatus = key === 'high' ? 'ask_first' : key === 'ok' ? 'suitable' : 'unknown';
  const riskLevel: RiskLevel = key === 'high' ? 'contains' : key === 'ok' ? 'unlikely' : 'unknown';
  return {
    status,
    riskLevel,
    confidence: key === 'unknown' ? 0 : 0.7,
    reason: CALORIE_COPY[key].reason,
    action: CALORIE_COPY[key].action,
    source: 'engine',
    lastCheckedAt: dishLastChecked(dish),
    allergenId: 'high_calorie',
  };
}

function evaluatePicky(profile: LocalUserProfile, dish: DishEvaluationInput): Evaluation | null {
  if (!profile.selectedProfileIds.includes(PICKY_PROFILE_ID)) return null;
  const flagged =
    dish.pickyEaterFlags.some((f) => PICKY_FLAGS.includes(f)) || dish.spicyLevel === 'high';
  const key = flagged ? 'flagged' : 'ok';
  return {
    status: flagged ? 'ask_first' : 'suitable',
    riskLevel: flagged ? 'contains' : 'unlikely',
    confidence: 0.7,
    reason: PICKY_COPY[key].reason,
    action: PICKY_COPY[key].action,
    source: 'engine',
    lastCheckedAt: dishLastChecked(dish),
    allergenId: 'strong_smell',
  };
}

function fallbackEvaluation(dish: DishEvaluationInput): Evaluation {
  return {
    status: 'suitable',
    riskLevel: 'unlikely',
    confidence: 0.6,
    reason: NO_CONSTRAINT_COPY.reason,
    action: NO_CONSTRAINT_COPY.action,
    source: 'engine',
    lastCheckedAt: dishLastChecked(dish),
  };
}

function selectHighest(evals: Evaluation[]): Evaluation | undefined {
  let best: Evaluation | undefined;
  for (const e of evals) {
    if (!best || STATUS_RANK[e.status] > STATUS_RANK[best.status]) best = e;
  }
  return best;
}

function mapConfidence(confidence: number, isUnknown: boolean): ConfidenceLabel {
  if (isUnknown) return 'low';
  if (confidence >= CONFIDENCE_HIGH) return 'high';
  if (confidence >= CONFIDENCE_MEDIUM) return 'medium';
  return 'low';
}

export function evaluateDish(profile: LocalUserProfile, dish: DishEvaluationInput): DishRecommendationCard {
  const evaluations: Evaluation[] = [...evaluateAllergies(profile, dish), ...evaluateReligious(profile, dish)];
  const calorie = evaluateCalorie(profile, dish);
  if (calorie) evaluations.push(calorie);
  const picky = evaluatePicky(profile, dish);
  if (picky) evaluations.push(picky);

  const selected = selectHighest(evaluations) ?? fallbackEvaluation(dish);
  const isUnknownRisk = selected.status === 'unknown' || selected.riskLevel === 'unknown';

  const action =
    selected.status === 'suitable'
      ? { en: copy.en.suitableCaveat, vi: copy.vi.suitableCaveat }
      : selected.action;

  const card: DishRecommendationCard = {
    dishId: dish.dishId,
    name: dish.name,
    status: selected.status,
    riskLevel: selected.riskLevel,
    confidence: mapConfidence(selected.confidence, isUnknownRisk),
    reason: selected.reason,
    action,
    source: selected.source,
    lastCheckedAt: selected.lastCheckedAt,
    matchedAllergens: distinct(
      evaluations
        .filter((e) => e.status !== 'suitable' && e.allergenId)
        .map((e) => e.allergenId as string),
    ),
  };

  // Safety invariant (§0/§8.2): an unknown-risk contributor must never be reported Suitable.
  if (card.status === 'suitable' && evaluations.some((e) => e.status === 'unknown')) {
    throw new Error('Invariant violated: unknown risk resolved to suitable');
  }

  return card;
}

export function evaluateDishes(
  profile: LocalUserProfile,
  dishes: DishEvaluationInput[],
): DishRecommendationCard[] {
  return dishes.map((dish) => evaluateDish(profile, dish));
}
