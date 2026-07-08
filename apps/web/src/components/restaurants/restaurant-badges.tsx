'use client';
import {
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Info,
  MapPin,
  MessageCircleQuestion,
  OctagonX,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RestaurantReadinessClass } from '@safebite/domain';

// Readiness A–E reuses the 5-status colour triads (A→suitable … E→avoid). Class strings are
// static literals so Tailwind's JIT emits them. Colour is never the only signal — always
// letter + label + icon (DESIGN_TOKENS rule).
const READINESS: Record<RestaurantReadinessClass, { cls: string; Icon: typeof CircleCheck }> = {
  A: { cls: 'text-sb-status-suitable-fg bg-sb-status-suitable-bg border-sb-status-suitable-border', Icon: CircleCheck },
  B: { cls: 'text-sb-status-ask-first-fg bg-sb-status-ask-first-bg border-sb-status-ask-first-border', Icon: MessageCircleQuestion },
  C: { cls: 'text-sb-status-unknown-fg bg-sb-status-unknown-bg border-sb-status-unknown-border', Icon: CircleHelp },
  D: { cls: 'text-sb-status-risky-fg bg-sb-status-risky-bg border-sb-status-risky-border', Icon: TriangleAlert },
  E: { cls: 'text-sb-status-avoid-fg bg-sb-status-avoid-bg border-sb-status-avoid-border', Icon: OctagonX },
};

export function RestaurantReadinessBadge({ readinessClass }: { readinessClass: RestaurantReadinessClass }) {
  const t = useTranslations('restaurantCard');
  const { cls, Icon } = READINESS[readinessClass];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sb-body-s font-bold ${cls}`}
      aria-label={`${t('readinessLabel')}: ${readinessClass} — ${t(`readiness.${readinessClass}`)}`}
    >
      <Icon aria-hidden className="size-4" />
      <span className="font-black">{readinessClass}</span>
      <span>{t(`readiness.${readinessClass}`)}</span>
    </span>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-full border border-sb-border bg-sb-surface-2 px-2.5 py-1 text-xs text-sb-muted';
const icon = 'size-3 text-sb-faint';

const VERIF = ['unverified', 'restaurant_contacted', 'restaurant_confirmed', 'admin_verified', 'expired', 'flagged'];
const MENU = ['not_observed', 'menu_url_available', 'observed_not_verified', 'restaurant_submitted', 'admin_verified'];
const SRC = [
  'openstreetmap', 'openmapvn', 'manual_seed', 'admin_manual', 'restaurant_submitted',
  'menu_observed', 'user_submitted', 'expert_review', 'admin_verified', 'google_places', 'foursquare',
  'dish_inferred', 'official_menu', 'user_report', 'engine',
];

export function RestaurantVerificationBadge({ status }: { status: string }) {
  const t = useTranslations('restaurantCard');
  return (
    <span className={chip}>
      <ShieldCheck aria-hidden className={icon} />
      {VERIF.includes(status) ? t(`verification.${status}`) : status}
    </span>
  );
}

export function RestaurantMenuStatusBadge({ status }: { status: string }) {
  const t = useTranslations('restaurantCard');
  return (
    <span className={chip}>
      <ClipboardList aria-hidden className={icon} />
      {MENU.includes(status) ? t(`menuStatus.${status}`) : status}
    </span>
  );
}

export function RestaurantSourceBadge({ source }: { source: string }) {
  const t = useTranslations('restaurantCard');
  return (
    <span className={chip}>
      <Info aria-hidden className={icon} />
      {SRC.includes(source) ? t(`source.${source}`) : source}
    </span>
  );
}

// meters -> "650 m" / "2.2 km"; null renders nothing.
export function RestaurantDistanceLabel({ meters }: { meters: number | null }) {
  const t = useTranslations('restaurantCard');
  if (meters === null) return null;
  const label = meters < 1000 ? t('distanceMeters', { meters }) : t('distanceKm', { km: (meters / 1000).toFixed(1) });
  return (
    <span className={chip}>
      <MapPin aria-hidden className={icon} />
      {label}
    </span>
  );
}
