import type { RecommendationStatus } from '@safebite/domain';

// §13 visual priority — display groups in this order so Avoid is first and Unknown
// always sits above (never buried under) Suitable.
export const STATUS_DISPLAY_ORDER: RecommendationStatus[] = ['avoid', 'risky', 'ask_first', 'unknown', 'suitable'];

export type GroupKey = 'suitable' | 'askFirst' | 'risky' | 'avoid' | 'unknown';

// Engine snake_case status -> API `groups` camelCase key.
export const GROUP_KEY: Record<RecommendationStatus, GroupKey> = {
  avoid: 'avoid',
  risky: 'risky',
  ask_first: 'askFirst',
  unknown: 'unknown',
  suitable: 'suitable',
};
