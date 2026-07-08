import { NextResponse } from 'next/server';
import type { z } from 'zod';

/** Uniform API envelope for every `/api` response (spec §9). */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function meta(requestId?: string) {
  return {
    generatedAt: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
  };
}

/** Success envelope. Callers must pass plain JSON-safe data (serialize Prisma Decimals to numbers first). */
export function apiOk<T>(data: T, opts?: { status?: number; requestId?: string }): NextResponse {
  const body: ApiResponse<T> = { data, meta: meta(opts?.requestId) };
  return NextResponse.json(body, { status: opts?.status ?? 200 });
}

/** Error envelope. Never leak stack traces — pass a stable `code` and a human message. */
export function apiError(
  code: string,
  message: string,
  opts?: { status?: number; details?: unknown; requestId?: string },
): NextResponse {
  const body: ApiResponse<null> = {
    data: null,
    meta: meta(opts?.requestId),
    error: {
      code,
      message,
      ...(opts?.details !== undefined ? { details: opts.details } : {}),
    },
  };
  return NextResponse.json(body, { status: opts?.status ?? 400 });
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** Validate a JSON request body against a Zod schema; returns a 400 envelope on failure. */
export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<Parsed<z.infer<S>>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: apiError('VALIDATION_ERROR', 'Invalid JSON body.', { status: 400 }) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      response: apiError('VALIDATION_ERROR', 'Invalid request body.', { status: 400, details: result.error.flatten() }),
    };
  }
  return { ok: true, data: result.data };
}

/** Validate URL query params against a Zod schema; returns a 400 envelope on failure. */
export function parseQuery<S extends z.ZodTypeAny>(url: string, schema: S): Parsed<z.infer<S>> {
  const params = Object.fromEntries(new URL(url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      ok: false,
      response: apiError('VALIDATION_ERROR', 'Invalid query parameters.', { status: 400, details: result.error.flatten() }),
    };
  }
  return { ok: true, data: result.data };
}
