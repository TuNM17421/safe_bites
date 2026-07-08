import { setRequestLocale } from 'next-intl/server';
import { RestaurantDetail } from '@/features/restaurants/restaurant-detail';

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; restaurantIdOrSlug: string }>;
}) {
  const { locale, restaurantIdOrSlug } = await params;
  setRequestLocale(locale);
  return <RestaurantDetail restaurantIdOrSlug={restaurantIdOrSlug} />;
}
