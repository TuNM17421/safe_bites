import { z } from 'zod';

// Feature-local fetchers + response Zod for the dish-at-restaurant ingredient list (mirrors
// restaurants-client.ts): unwrap the `{ data }` envelope and validate before returning.
const bilingual = z.object({ en: z.string(), vi: z.string() });

const ingredientRowSchema = z.object({
  id: z.string(),
  ingredientId: z.string(),
  name: bilingual,
  allergenTags: z.array(z.string()),
  note: z.string().nullable(),
  source: z.string(),
  contributorType: z.string(),
  verificationStatus: z.string(),
});

const ingredientsResponseSchema = z.object({
  menuItem: z.object({ id: z.string(), restaurantId: z.string(), name: bilingual }),
  ingredients: z.array(ingredientRowSchema),
  provenance: z.object({
    selfDeclared: z.boolean(),
    userContributionCount: z.number(),
    adminCount: z.number(),
    ocrCount: z.number(),
  }),
});

const ingredientOptionSchema = z.object({ id: z.string(), name: bilingual });
const ingredientOptionsResponseSchema = z.object({ ingredients: z.array(ingredientOptionSchema) });

export type MenuItemIngredientsResponse = z.infer<typeof ingredientsResponseSchema>;
export type IngredientRowDTO = z.infer<typeof ingredientRowSchema>;
export type IngredientOption = z.infer<typeof ingredientOptionSchema>;

export async function fetchMenuItemIngredients(menuItemId: string): Promise<MenuItemIngredientsResponse> {
  const res = await fetch(`/api/v1/menu-items/${encodeURIComponent(menuItemId)}/ingredients`);
  if (res.status === 404) throw new Error('menu_item_not_found');
  if (!res.ok) throw new Error(`ingredients_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return ingredientsResponseSchema.parse(json.data);
}

export async function addMenuItemIngredient(menuItemId: string, ingredientId: string): Promise<void> {
  const res = await fetch(`/api/v1/menu-items/${encodeURIComponent(menuItemId)}/ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredientId }),
  });
  if (!res.ok) throw new Error(`add_ingredient_failed_${res.status}`);
}

export async function searchIngredients(q: string): Promise<IngredientOption[]> {
  const res = await fetch(`/api/v1/ingredients?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`ingredient_search_failed_${res.status}`);
  const json = (await res.json()) as { data: unknown };
  return ingredientOptionsResponseSchema.parse(json.data).ingredients;
}
