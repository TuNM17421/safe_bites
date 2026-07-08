'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from './use-admin-resource';
import type { RestaurantRow } from './restaurant-form';

// TanStack Query hooks for the menu-item + allergen-status admin APIs. The menu-item API is
// asymmetric (list/create scoped under a restaurant, update/delete under /menu-items/{id}), so
// it doesn't fit the generic useAdminResource; these small hooks reuse the shared adminFetch.

export interface AllergenStatusRow {
  id: string;
  menuItemId: string;
  allergenId: string;
  riskLevel: string;
  confidence: number;
  source: string;
  reasonEn: string;
  reasonVi: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string;
  updatedAt: string;
}

export interface MenuItemRow {
  id: string;
  restaurantId: string;
  dishId: string | null;
  rawName: string;
  nameVi: string | null;
  nameEn: string | null;
  section: string | null;
  descriptionVi: string | null;
  descriptionEn: string | null;
  priceAmount: number | null;
  currency: string | null;
  menuSourceType: string;
  menuSourceUrl: string | null;
  observedAt: string;
  parsedBy: string;
  mappingConfidence: number | null;
  menuStatus: string;
  ingredientNotes: string | null;
  customizationNotes: string | null;
  sharedCookware: string | null;
  sharedFryer: string | null;
  canCustomize: string | null;
  notes: string | null;
  allergenStatuses?: AllergenStatusRow[];
  updatedAt: string;
}

export function useRestaurant(id: string) {
  const qc = useQueryClient();
  const base = `/api/v1/admin/restaurants/${id}`;
  const key = ['restaurant', id];
  const query = useQuery({ queryKey: key, queryFn: () => adminFetch<RestaurantRow>(base) });
  const update = useMutation({
    mutationFn: (body: unknown) => adminFetch<RestaurantRow>(base, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { query, update };
}

export function useMenuItems(restaurantId: string) {
  const qc = useQueryClient();
  const base = `/api/v1/admin/restaurants/${restaurantId}/menu-items`;
  const key = ['menu-items', restaurantId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const list = useQuery({ queryKey: key, queryFn: () => adminFetch<MenuItemRow[]>(base) });
  const create = useMutation({
    mutationFn: (body: unknown) => adminFetch<MenuItemRow>(base, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      adminFetch<MenuItemRow>(`/api/v1/admin/menu-items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminFetch<{ ok: true }>(`/api/v1/admin/menu-items/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  return { list, create, update, remove };
}

export function useAllergenStatuses(menuItemId: string, restaurantId?: string) {
  const qc = useQueryClient();
  const base = `/api/v1/admin/menu-items/${menuItemId}/allergen-statuses`;
  const key = ['allergen-statuses', menuItemId];
  const list = useQuery({ queryKey: key, queryFn: () => adminFetch<AllergenStatusRow[]>(base) });
  const replace = useMutation({
    mutationFn: (body: unknown) => adminFetch<AllergenStatusRow[]>(base, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      // Refresh the menu list so per-item allergen counts update.
      if (restaurantId) qc.invalidateQueries({ queryKey: ['menu-items', restaurantId] });
    },
  });
  return { list, replace };
}
