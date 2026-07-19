// PURE feedback-report planning (spec §17.2/§17.3). No Prisma, no framework — imports only the
// framework-free domain package, so it is unit-testable in the DB-less `quality` CI job.

import {
  buildAutoFlagSpecs,
  getFeedbackPriority,
  shouldAutoCreateFeedbackFlag,
  type FeedbackFlagSpec,
  type FeedbackPriority,
  type FeedbackReportInput,
} from '@safebite/domain';

export interface ResolvedEntities {
  /** Effective dishId after menu-item derivation (null when there is no mapped dish). */
  dishId: string | null;
}

/** The ONLY profile data persisted with a report (§2.3) — never the raw store, never geolocation. */
export interface FeedbackProfileSnapshot {
  allergies: Array<{ allergenId: string; severity: string; crossContactSensitive: boolean | 'not_sure' }>;
  dietaryProfiles: string[];
}

/**
 * Whitelist the minimal profile snapshot (§2.3): only allergy id/severity/cross-contact + dietary
 * ids. Pure + unit-tested so the "never spread the raw request body" guarantee cannot silently
 * regress. Anything not listed here (notes, geolocation, tokens, extra keys) is dropped.
 */
export function buildMinimalProfileSnapshot(input: FeedbackReportInput): FeedbackProfileSnapshot {
  const allergies = (input.profileSnapshot?.allergies ?? []).map((a) => ({
    allergenId: a.allergenId,
    severity: a.severity,
    crossContactSensitive: a.crossContactSensitive,
  }));
  return { allergies, dietaryProfiles: input.profileSnapshot?.dietaryProfiles ?? [] };
}

export interface FeedbackReportPlan {
  input: FeedbackReportInput;
  resolved: ResolvedEntities;
  priority: FeedbackPriority;
  severeAutoFlagged: boolean;
  flagSpecs: FeedbackFlagSpec[];
}

/**
 * Map a validated submission + resolved entities to the persist plan: derive priority, decide
 * whether severe/anaphylaxis auto-flags are needed, and (if so) compute the flag specs. The
 * persistence layer only writes what this returns — all trust logic lives in the domain.
 */
export function planFeedbackReport(
  input: FeedbackReportInput,
  resolved: ResolvedEntities,
): FeedbackReportPlan {
  const flagInput = {
    reaction: input.reaction,
    restaurantId: input.restaurantId,
    menuItemId: input.menuItemId ?? null,
    dishId: resolved.dishId,
    allergenIds: input.allergenIds,
  };
  const priority = getFeedbackPriority({
    reaction: input.reaction,
    ateHere: input.ateHere ?? undefined,
  });
  const severeAutoFlagged = shouldAutoCreateFeedbackFlag(flagInput);
  const flagSpecs = severeAutoFlagged ? buildAutoFlagSpecs(flagInput) : [];
  return { input, resolved, priority, severeAutoFlagged, flagSpecs };
}
