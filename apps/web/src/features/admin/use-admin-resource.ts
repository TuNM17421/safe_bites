'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Generic admin CRUD over the /api/v1/admin/* envelope (DRY across dishes/ingredients/risks).
// The httpOnly sbt_admin cookie rides along automatically (same-origin fetch).
export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const base = json?.error?.message ?? `Request failed (${res.status})`;
    // Surface the specific Zod field reasons (e.g. "confidence: must not exceed 0.5") instead of
    // the generic "Invalid request body." — critical for the allergen safety-rule validations.
    const fieldErrors = json?.error?.details?.fieldErrors as Record<string, string[]> | undefined;
    const formErrors = json?.error?.details?.formErrors as string[] | undefined;
    const parts: string[] = [];
    if (fieldErrors) {
      for (const [field, msgs] of Object.entries(fieldErrors)) {
        if (msgs?.length) parts.push(`${field}: ${msgs.join(', ')}`);
      }
    }
    if (formErrors?.length) parts.push(...formErrors);
    throw new Error(parts.length ? `${base} (${parts.join('; ')})` : base);
  }
  return json.data as T;
}

export function useAdminResource<T extends { id: string }>(basePath: string, query: Record<string, string> = {}) {
  const qc = useQueryClient();
  const qs = new URLSearchParams(query).toString();
  const invalidate = () => qc.invalidateQueries({ queryKey: [basePath] });

  const list = useQuery({
    queryKey: [basePath, qs],
    queryFn: () => adminFetch<T[]>(qs ? `${basePath}?${qs}` : basePath),
  });

  const create = useMutation({
    mutationFn: (body: unknown) => adminFetch<T>(basePath, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      adminFetch<T>(`${basePath}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminFetch<{ ok: true }>(`${basePath}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return { list, create, update, remove };
}
