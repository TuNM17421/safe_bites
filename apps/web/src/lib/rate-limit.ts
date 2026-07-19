// Best-effort in-memory rate limiter (spec §9.3). NON-DURABLE by design: module-scope, per
// server instance, resets on redeploy, and NOT shared across serverless instances. The real
// correctness guard for feedback is the `clientReportId @unique` dedup — a bypassed limiter can
// never cause a duplicate write. Acceptable for Phase 03 v1 per the plan's contract.

type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const buckets = new Map<string, Bucket>();

/** Fixed-window limiter. Returns true if the call is allowed, false if the key is over the limit. */
export function rateLimit(key: string, opts?: { windowMs?: number; max?: number }): boolean {
  const windowMs = opts?.windowMs ?? WINDOW_MS;
  const max = opts?.max ?? MAX_PER_WINDOW;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

/** Best-effort client identity from proxy headers (no PII stored, used only as a limiter key). */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}
