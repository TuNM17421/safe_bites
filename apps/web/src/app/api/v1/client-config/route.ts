import { apiOk } from '@/lib/api-response';
import { publicEnv, serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

// §9.2 — static client config sourced from validated env. No DB.
export function GET() {
  const env = serverEnv();
  return apiOk({
    supportedCities: publicEnv.NEXT_PUBLIC_SUPPORTED_CITIES,
    defaultCity: publicEnv.NEXT_PUBLIC_DEFAULT_CITY,
    supportedLanguages: publicEnv.NEXT_PUBLIC_SUPPORTED_LANGUAGES,
    offlineCacheTtlDays: env.OFFLINE_CACHE_TTL_DAYS,
    pwaInstallEnabled: env.PWA_INSTALL_ENABLED,
  });
}
