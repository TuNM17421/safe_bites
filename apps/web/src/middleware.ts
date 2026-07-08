import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminCookie } from './lib/admin-auth';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Admin perimeter composed AROUND next-intl (phase-12 §9.7). Admin paths are handled first
// so `/admin` is never locale-redirected to `/en/admin`; everything else falls through to
// the intl middleware. `requireAdmin` in each handler is the authoritative second layer.
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;

  // Admin API — JSON 401 when unauthenticated (login is exempt).
  if (pathname.startsWith('/api/v1/admin')) {
    if (pathname === '/api/v1/admin/login') return NextResponse.next();
    if (await verifyAdminCookie(cookie)) return NextResponse.next();
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Admin authentication required.' } },
      { status: 401 },
    );
  }

  // Admin pages — redirect (outside locale routing); login is exempt.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const authed = await verifyAdminCookie(cookie);
    if (pathname === '/admin/login') {
      return authed ? NextResponse.redirect(new URL('/admin', req.url)) : NextResponse.next();
    }
    return authed ? NextResponse.next() : NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  // Add the admin page + admin API paths (the base page matcher excludes /api).
  matcher: ['/admin/:path*', '/api/v1/admin/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
