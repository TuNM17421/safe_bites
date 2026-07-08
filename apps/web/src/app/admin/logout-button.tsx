'use client';
import { useRouter } from 'next/navigation';
import { adminMessages } from './admin-messages';

export function AdminLogout() {
  const router = useRouter();
  const onLogout = async () => {
    await fetch('/api/v1/admin/login', { method: 'DELETE' });
    router.replace('/admin/login');
  };
  return (
    <button
      type="button"
      onClick={onLogout}
      className="min-h-9 rounded-sb-sm border border-sb-border px-3 text-sm text-sb-muted hover:bg-sb-surface-2 focus-visible:shadow-sb-focus focus-visible:outline-none"
    >
      {adminMessages.nav.logout}
    </button>
  );
}
