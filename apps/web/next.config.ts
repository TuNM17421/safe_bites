import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Transpile the workspace domain package (shared TS source, consumed from Phase 06).
  transpilePackages: ['@safebite/domain'],
};

export default withNextIntl(nextConfig);
