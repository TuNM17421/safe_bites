import { setRequestLocale } from 'next-intl/server';
import { ScaffoldScreen } from '@/components/common/scaffold-screen';

// v2 /login — biometric sign-in (Phase 14), lives OUTSIDE the (app) shell so it has no
// bottom nav / profile gating. Scaffold only; real WebAuthn/simulated ceremony lands later.
export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <ScaffoldScreen titleKey="scaffold.login" />
    </div>
  );
}
