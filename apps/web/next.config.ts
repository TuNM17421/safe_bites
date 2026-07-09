import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Service worker is compiled from src/lib/service-worker.ts to public/sw.js at build.
// Disabled in dev to keep HMR sane (offline is verified against a production build).
const withSerwist = withSerwistInit({
  swSrc: 'src/lib/service-worker.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  // Transpile the workspace domain package (shared TS source, consumed from Phase 06).
  transpilePackages: ['@safebite/domain'],
  // Linting is a dedicated CI gate (`pnpm lint`, the flat-config source of truth); don't let
  // `next build`'s stricter built-in ESLint pass double-lint and diverge from it (Phase 13).
  eslint: { ignoreDuringBuilds: true },
  // Enable React's <ViewTransition> integration so route navigations cross-fade / morph.
  experimental: { viewTransition: true },
};

export default withSerwist(withNextIntl(nextConfig));
