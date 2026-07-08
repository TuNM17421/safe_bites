import type { ReviewStatus, SourceType } from '@prisma/client';

export function normalizeReview(v: string): ReviewStatus {
  return v === 'approved' || v === 'rejected' ? (v as ReviewStatus) : 'needs_review';
}

const SOURCE_TYPES = new Set([
  'manual_seed',
  'menu_observed',
  'restaurant_submitted',
  'user_submitted',
  'expert_review',
  'openstreetmap',
  'openmapvn',
  'google_places',
  'foursquare',
  'admin_verified',
]);

export function normalizeSource(v: string): SourceType {
  return SOURCE_TYPES.has(v) ? (v as SourceType) : 'manual_seed';
}
