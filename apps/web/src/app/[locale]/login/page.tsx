import { setRequestLocale } from 'next-intl/server';
import { LoginScreen } from '@/features/login/login-screen';

// /login — simulated biometric unlock. Deliberately OUTSIDE the (app) route group (like /onboarding)
// so it renders without the persistent AppHeader/BottomNav. The screen owns its full-height layout.
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginScreen />;
}
