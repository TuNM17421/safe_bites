import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const WEEK = 7 * 24 * 60 * 60;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never cache personalized/compute results or admin — a stale risk verdict served as
    // fresh would be a safety regression (§0). POST is excluded here too.
    {
      matcher: ({ url, request }) =>
        request.method !== 'GET' || /^\/api\/v1\/(recommendations|question-cards|admin)/.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // Public read APIs: network-first with a short (7d) cache for offline reads.
    {
      matcher: ({ url }) => /^\/api\/v1\/(client-config|profile-templates|allergens|dishes)/.test(url.pathname),
      handler: new NetworkFirst({
        cacheName: 'sb-api',
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: WEEK })],
      }),
    },
    // Static assets: cache-first.
    {
      matcher: ({ request }) => ['style', 'script', 'image', 'font'].includes(request.destination),
      handler: new CacheFirst({
        cacheName: 'sb-static',
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // HTML navigations: network-first (offline.html fallback provided below).
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({ cacheName: 'sb-pages', networkTimeoutSeconds: 3 }),
    },
  ],
  fallbacks: {
    entries: [{ url: '/offline.html', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
