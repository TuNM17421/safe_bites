// Phase 03 feedback signal logic (spec §8). Pure, deterministic, framework-free.
// - priority mapping + severe auto-flag specs (submit path)
// - time decay for non-severe signals
// - public aggregate summary (never exposes raw notes)

import type { RestaurantReadinessClass } from '../restaurant-types';
import type {
  FeedbackEntityType,
  FeedbackFlagEffect,
  FeedbackFlagStatus,
  FeedbackPriority,
  FeedbackReaction,
} from './schemas';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_RANK: Record<FeedbackPriority, number> = { low: 1, normal: 2, high: 3, urgent: 4 };

// Internal admin reason strings (English-only, internal audit; §17.3). Public copy is keyed
// separately via publicReasonKey. None contain a copy:check-forbidden phrase.
const AUTO_FLAG_REASON = {
  restaurant: 'Recent severe feedback pending review for matching allergen.',
  menuItem: 'Recent severe feedback pending review for this menu item/allergen.',
  dish: 'Recent severe feedback pending review for this dish/allergen.',
} as const;

// ---- Types ----

// A minimal active-flag projection used by the recommendation engine (§8.2). Only active flags
// are ever loaded, but `status` is carried optionally so decay/ignore logic is defense-in-depth.
export interface FeedbackSignal {
  id: string;
  entityType: FeedbackEntityType;
  entityId: string;
  restaurantId?: string | null;
  menuItemId?: string | null;
  dishId?: string | null;
  allergenId?: string | null;
  effect: FeedbackFlagEffect;
  priority: FeedbackPriority;
  status?: FeedbackFlagStatus;
  createdAt: string;
  expiresAt?: string | null;
  confidenceDelta?: number | null;
  readinessCap?: RestaurantReadinessClass | null;
  publicReasonKey?: string | null;
}

// Aggregate, privacy-safe summary for public recommendation responses (§18).
export interface FeedbackSummary {
  hasActiveFlags: boolean;
  highestPriority?: FeedbackPriority;
  pendingReviewCount: number;
  recentReportCount: number;
  lastReportAt?: string | null;
  publicMessageKey?:
    | 'feedback_under_review'
    | 'feedback_under_review_severe'
    | 'feedback_under_review_severe_item';
}

// The shape the submit service persists as a FeedbackFlag row (§17.3). `reason` is internal.
export interface FeedbackFlagSpec {
  entityType: FeedbackEntityType;
  entityId: string;
  restaurantId?: string | null;
  menuItemId?: string | null;
  dishId?: string | null;
  allergenId?: string | null;
  effect: FeedbackFlagEffect;
  priority: FeedbackPriority;
  status: FeedbackFlagStatus;
  reason: string;
  publicReasonKey: string;
  readinessCap?: RestaurantReadinessClass | null;
  confidenceDelta?: number | null;
  expiresAt?: string | null;
}

// ---- Helpers ----

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// §11.2 allergen match: an unscoped flag (allergenId null) matches any profile; otherwise the
// flag's allergen must be in the profile.
export function signalMatchesProfile(
  signal: Pick<FeedbackSignal, 'allergenId'>,
  profileAllergenIds: string[],
): boolean {
  return signal.allergenId == null || profileAllergenIds.includes(signal.allergenId);
}

// §11.2 entity match for a menu item: item-level, its dish, or its restaurant.
export function signalTargetsMenuItem(
  signal: FeedbackSignal,
  ref: { menuItemId: string; dishId?: string | null; restaurantId: string },
): boolean {
  if (signal.menuItemId) return signal.menuItemId === ref.menuItemId;
  if (signal.dishId) return ref.dishId != null && signal.dishId === ref.dishId;
  if (signal.restaurantId) return signal.restaurantId === ref.restaurantId;
  if (signal.entityType === 'menu_item') return signal.entityId === ref.menuItemId;
  if (signal.entityType === 'dish') return ref.dishId != null && signal.entityId === ref.dishId;
  return signal.entityType === 'restaurant' && signal.entityId === ref.restaurantId;
}

export function signalTargetsRestaurant(signal: FeedbackSignal, restaurantId: string): boolean {
  if (signal.restaurantId) return signal.restaurantId === restaurantId;
  return signal.entityType === 'restaurant' && signal.entityId === restaurantId;
}

// ---- Pure functions (§8.3/§8.4) ----

// §8.4 priority mapping (reaction-driven; ateHere reserved for future weighting).
export function getFeedbackPriority(input: {
  reaction: FeedbackReaction;
  ateHere?: boolean | null;
}): FeedbackPriority {
  switch (input.reaction) {
    case 'anaphylaxis_or_emergency':
    case 'severe':
      return 'urgent';
    case 'moderate':
      return 'high';
    case 'none':
      return 'low';
    default:
      return 'normal'; // mild, not_sure, prefer_not_to_say
  }
}

export function shouldAutoCreateFeedbackFlag(input: {
  reaction: FeedbackReaction;
  restaurantId: string;
  menuItemId?: string | null;
  dishId?: string | null;
  allergenIds: string[];
}): boolean {
  return input.reaction === 'severe' || input.reaction === 'anaphylaxis_or_emergency';
}

// §17.3: severe/anaphylaxis reports auto-create active flags — restaurant cap, plus a
// menu-item (or dish) flag — scoped one-per-allergen (or one unscoped flag when none given).
export function buildAutoFlagSpecs(input: {
  reaction: FeedbackReaction;
  restaurantId: string;
  menuItemId?: string | null;
  dishId?: string | null;
  allergenIds: string[];
}): FeedbackFlagSpec[] {
  if (!shouldAutoCreateFeedbackFlag(input)) return [];
  const { restaurantId, menuItemId, dishId } = input;
  const scopes: (string | null)[] = input.allergenIds.length > 0 ? input.allergenIds : [null];
  const specs: FeedbackFlagSpec[] = [];

  for (const allergenId of scopes) {
    specs.push({
      entityType: 'restaurant',
      entityId: restaurantId,
      restaurantId,
      allergenId,
      effect: 'cap_restaurant_readiness',
      priority: 'urgent',
      status: 'active',
      readinessCap: 'D',
      reason: AUTO_FLAG_REASON.restaurant,
      publicReasonKey: 'feedback_under_review_severe',
    });

    if (menuItemId) {
      specs.push({
        entityType: 'menu_item',
        entityId: menuItemId,
        restaurantId,
        menuItemId,
        allergenId,
        effect: 'suppress_suitable',
        priority: 'urgent',
        status: 'active',
        reason: AUTO_FLAG_REASON.menuItem,
        publicReasonKey: 'feedback_under_review_severe_item',
      });
    } else if (dishId) {
      specs.push({
        entityType: 'dish',
        entityId: dishId,
        dishId,
        allergenId,
        effect: 'flag_for_review',
        priority: 'high',
        status: 'active',
        reason: AUTO_FLAG_REASON.dish,
        publicReasonKey: 'feedback_under_review',
      });
    }
  }
  return specs;
}

// §8.4 decay. Non-active → 0. Active urgent (severe/anaphylaxis) → 1.0, no decay. Else by age.
export function feedbackSignalWeight(input: {
  createdAt: Date | string;
  now?: Date | string;
  priority: FeedbackPriority;
  status?: FeedbackFlagStatus;
}): number {
  const status = input.status ?? 'active';
  if (status !== 'active') return 0;
  if (input.priority === 'urgent') return 1;
  const created = asDate(input.createdAt);
  const now = asDate(input.now ?? new Date());
  if (!created || !now) return 1; // freshness unknown → keep full weight (conservative)
  const ageDays = (now.getTime() - created.getTime()) / DAY_MS;
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.7;
  if (ageDays <= 180) return 0.4;
  return 0.15;
}

// §18 aggregate summary over signals already scoped to an entity by the caller. Applies the
// allergen match + weight>0 filter; emits only privacy-safe counts/keys.
export function summarizeFeedbackSignals(input: {
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  now?: Date | string;
}): FeedbackSummary {
  const { profileAllergenIds, now } = input;
  const matched = input.signals.filter(
    (s) =>
      signalMatchesProfile(s, profileAllergenIds) &&
      feedbackSignalWeight({ createdAt: s.createdAt, now, priority: s.priority, status: s.status }) > 0,
  );

  if (matched.length === 0) {
    return { hasActiveFlags: false, pendingReviewCount: 0, recentReportCount: 0, lastReportAt: null };
  }

  const highestPriority = matched.reduce<FeedbackPriority>(
    (max, s) => (PRIORITY_RANK[s.priority] > PRIORITY_RANK[max] ? s.priority : max),
    'low',
  );
  // recentReportCount counts recent active flags (a subset of pendingReviewCount). The API layer
  // may override this with a true recent-report count if it needs the §18 "reports" semantics.
  const recentReportCount = matched.filter(
    (s) => feedbackSignalWeight({ createdAt: s.createdAt, now, priority: s.priority, status: s.status }) >= 0.7,
  ).length;
  // Compare by parsed time, not lexicographically (mixed date-only / datetime strings misorder).
  const lastReportAt = matched.reduce<string | null>((latest, s) => {
    if (latest == null) return s.createdAt;
    const a = asDate(s.createdAt)?.getTime() ?? 0;
    const b = asDate(latest)?.getTime() ?? 0;
    return a > b ? s.createdAt : latest;
  }, null);

  const hasSevereItem = matched.some((s) => s.effect === 'suppress_suitable' && s.priority === 'urgent');
  const hasSevereRestaurant = matched.some(
    (s) => s.effect === 'cap_restaurant_readiness' && s.priority === 'urgent',
  );
  const publicMessageKey = hasSevereItem
    ? 'feedback_under_review_severe_item'
    : hasSevereRestaurant
      ? 'feedback_under_review_severe'
      : 'feedback_under_review';

  return {
    hasActiveFlags: true,
    highestPriority,
    pendingReviewCount: matched.length,
    recentReportCount,
    lastReportAt,
    publicMessageKey,
  };
}
