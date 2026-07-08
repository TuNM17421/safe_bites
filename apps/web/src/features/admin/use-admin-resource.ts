'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Generic admin CRUD over the /api/v1/admin/* envelope (DRY across dishes/ingredients/risks).
// The httpOnly sbt_admin cookie rides along automatically (same-origin fetch).
async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
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
