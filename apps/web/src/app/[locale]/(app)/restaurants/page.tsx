import { setRequestLocale } from 'next-intl/server';
import { RestaurantGuide } from '@/features/restaurants/restaurant-guide';

export default async function RestaurantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RestaurantGuide />;
}
