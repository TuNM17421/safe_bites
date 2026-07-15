import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from './admin-shell';
// The /admin segment is its own top-level route tree (there is no app/layout.tsx, so this and
// [locale]/layout.tsx are the two ROOT layouts). A root layout MUST render <html>/<body> — hence
// this server component does so and pulls in the global stylesheet ([locale]'s import doesn't reach
// here). The interactive shell (intl + query providers, nav) lives in the client AdminShell.
import '../globals.css';

export const metadata: Metadata = { title: 'SafeBite Admin' };

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-sb-bg text-sb-fg antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
