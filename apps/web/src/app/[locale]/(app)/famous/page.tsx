import { setRequestLocale } from 'next-intl/server';
import { FamousList } from '@/features/dishes/famous-list';

// v2 /famous — famous local dishes (Nổi tiếng). RSC shell; the list is a client island because
// the per-dish chip is evaluated against the on-device profile.
export default async function FamousPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FamousList />;
}
