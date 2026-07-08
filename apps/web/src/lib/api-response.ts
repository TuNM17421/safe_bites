import { NextResponse } from 'next/server';

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
