import { setRequestLocale } from 'next-intl/server';
import { DishDetail } from '@/features/dishes/dish-detail';

export default async function DishDetailPage({ params }: { params: Promise<{ locale: string; dishId: string }> }) {
  const { locale, dishId } = await params;
  setRequestLocale(locale);
  return <DishDetail dishId={dishId} />;
}
