import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProfileView } from '@/features/profile/profile-view';

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-sb-h1 text-sb-fg">{t('nav.profile')}</h1>
      <ProfileView />
    </div>
  );
}
