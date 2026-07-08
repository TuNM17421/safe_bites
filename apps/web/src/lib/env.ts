import { z } from 'zod';

const csvToArray = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Client-safe env — only NEXT_PUBLIC_* values, inlined into the bundle. */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_DEFAULT_CITY: z.string().min(1),
  NEXT_PUBLIC_SUPPORTED_CITIES: z
    .string()
    .transform(csvToArray)
    .pipe(z.array(z.string().min(1)).min(1)),
  NEXT_PUBLIC_SUPPORTED_LANGUAGES: z
    .string()
    .transform(csvToArray)
    .pipe(z.array(z.enum(['en', 'vi'])).min(1)),
});

// Reference each var literally so Next can inline them at build time.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_DEFAULT_CITY: process.env.NEXT_PUBLIC_DEFAULT_CITY,
  NEXT_PUBLIC_SUPPORTED_CITIES: process.env.NEXT_PUBLIC_SUPPORTED_CITIES,
  NEXT_PUBLIC_SUPPORTED_LANGUAGES: process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES,
});

export type PublicEnv = typeof publicEnv;

/** Server-only env — never import into client components (would leak secrets). */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_TOKEN: z.string().min(1),
  OFFLINE_CACHE_TTL_DAYS: z.coerce.number().int().positive().default(7),
  PWA_INSTALL_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Lazily validate and cache server env. Call only from server code (routes, actions). */
export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_TOKEN: process.env.ADMIN_TOKEN,
      OFFLINE_CACHE_TTL_DAYS: process.env.OFFLINE_CACHE_TTL_DAYS,
      PWA_INSTALL_ENABLED: process.env.PWA_INSTALL_ENABLED,
    });
  }
  return cached;
}
