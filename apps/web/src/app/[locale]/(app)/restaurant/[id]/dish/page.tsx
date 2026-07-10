import { setRequestLocale } from 'next-intl/server';
import { ScaffoldScreen } from '@/components/common/scaffold-screen';

// v2 /restaurant/:id/dish — dish-at-restaurant ingredient provenance (Phase 07). Scaffold only.
export default async function RestaurantDishPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ScaffoldScreen titleKey="scaffold.dish" />;
}
