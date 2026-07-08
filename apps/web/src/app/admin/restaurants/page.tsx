'use client';
import { useTranslations } from 'next-intl';
import { RestaurantAdminList } from '@/features/admin/restaurant-admin-list';

export default function AdminRestaurantsPage() {
  const t = useTranslations('admin');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-extrabold text-sb-fg">{t('restaurant.heading')}</h1>
      <RestaurantAdminList />
    </div>
  );
}
