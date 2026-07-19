import { setRequestLocale } from 'next-intl/server';
import { HomeMap } from '@/features/home/home-map';

// v2 /home — map-first (Bản đồ). RSC shell; the interactive map island is client-only.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeMap />;
}
