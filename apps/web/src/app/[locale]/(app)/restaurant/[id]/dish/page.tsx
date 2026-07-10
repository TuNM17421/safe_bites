import { setRequestLocale } from 'next-intl/server';
import { DishAtRestaurant } from '@/features/restaurants/dish-at-restaurant';

// v2 /restaurant/:id/dish — dish-at-restaurant ingredient provenance (Phase 07). RSC shell;
// the interactive ingredient list + actions are a client feature. `menuItemId` selects the dish.
export default async function RestaurantDishPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ menuItemId?: string }>;
}) {
  const { locale, id } = await params;
  const { menuItemId } = await searchParams;
  setRequestLocale(locale);
  return <DishAtRestaurant restaurantIdOrSlug={id} menuItemId={menuItemId ?? null} />;
}
