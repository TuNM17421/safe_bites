import { redirect } from '@/i18n/navigation';

// v2 (Phase 03): the standalone allergy card is folded into /profile. Keep a locale-aware
// 302 so old links/bookmarks still resolve.
export default async function AllergyCardRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/profile', locale });
}
