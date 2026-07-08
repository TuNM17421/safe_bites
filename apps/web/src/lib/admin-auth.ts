import type { NextResponse } from 'next/server';
import { apiError } from './api-response';

// Edge-safe admin auth (spec §9.7). Imported by BOTH the Edge middleware and Node route
// handlers, so it uses Web Crypto (`crypto.subtle`) + a pure-JS constant-time compare —
// never `node:crypto`. The cookie carries a SHA-256 DIGEST of ADMIN_TOKEN (a stable marker),
// not the raw token; presence-only checks would be trivially forgeable.

export const ADMIN_COOKIE = 'sbt_admin';
const MAX_AGE_SECONDS = 8 * 60 * 60;

export async function computeAdminDigest(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Length-guarded XOR compare. Both operands are fixed-length hex digests, so the early
// length check does not leak useful timing.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  const token = process.env.ADMIN_TOKEN;
  if (!value || !token) return false;
  return constantTimeEqual(value, await computeAdminDigest(token));
}

interface AdminCookieInit {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: 'strict';
  secure: boolean;
  path: string;
  maxAge: number;
}

export function adminCookie(digest: string): AdminCookieInit {
  return {
    name: ADMIN_COOKIE,
    value: digest,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}

export function clearedAdminCookie(): AdminCookieInit {
  return { ...adminCookie(''), maxAge: 0 };
}

// Reads a cookie from the raw request header — works in both Edge and Node runtimes.
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

// Authoritative in-handler guard (defense-in-depth behind the middleware perimeter).
// Returns a 401 envelope to short-circuit, or null when authenticated.
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const cookie = readCookie(req, ADMIN_COOKIE);
  if (await verifyAdminCookie(cookie)) return null;
  return apiError('UNAUTHORIZED', 'Admin authentication required.', { status: 401 });
}
