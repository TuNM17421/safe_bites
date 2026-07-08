import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Run on page routes only; exclude /api (must not be locale-redirected), Next
  // internals, and any path with a file extension (static assets).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
