'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { addMenuItemIngredient, fetchMenuItemIngredients } from './dish-ingredients-client';

// Online-guarded (like use-restaurant-detail) — ingredient rows carry no user location, so there
// is nothing to strip; offline simply shows the empty/offline state.
export function useMenuItemIngredients(menuItemId: string | null) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const queryKey = ['menu-item-ingredients', menuItemId] as const;

  const query = useQuery({
    queryKey,
    enabled: Boolean(menuItemId) && online,
    queryFn: () => fetchMenuItemIngredients(menuItemId as string),
  });

  const add = useMutation({
    mutationFn: (ingredientId: string) => addMenuItemIngredient(menuItemId as string, ingredientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { data: query.data, isLoading: query.isPending && query.fetchStatus !== 'idle', isError: query.isError, online, add };
}
