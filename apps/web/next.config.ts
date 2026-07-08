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
};

export default withSerwist(withNextIntl(nextConfig));
