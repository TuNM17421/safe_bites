import { setRequestLocale } from 'next-intl/server';
import { RestaurantDetail } from '@/features/restaurants/restaurant-detail';

// v2 /restaurant/:id — restaurant detail (moved from the plural /restaurants/[restaurantIdOrSlug]
// in Phase 02). The `id` param still accepts a slug OR id; the API path stays plural.
// Phase 07 upgrades this with the compatibility %-ring.
export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <RestaurantDetail restaurantIdOrSlug={id} />;
}
