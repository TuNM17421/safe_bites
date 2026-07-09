import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const feedbackOptionsSchema = z.object({
  restaurant: z.object({
    id: z.string(),
    name: z.string(),
    city: z.string(),
  }),
  menuItems: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      dishId: z.string().nullable(),
      dishName: z.string().nullable(),
    }),
  ),
  allergens: z.array(
    z.object({
      id: z.string(),
      nameEn: z.string(),
      nameVi: z.string(),
    }),
  ),
});

export type FeedbackOptions = z.infer<typeof feedbackOptionsSchema>;

async function fetchFeedbackOptions(restaurantId: string): Promise<FeedbackOptions> {
  const res = await fetch(`/api/v1/feedback/options?restaurantId=${encodeURIComponent(restaurantId)}`);
  if (!res.ok) {
    throw new Error('Failed to load feedback options');
  }
  const json = (await res.json()) as { data: unknown };
  return feedbackOptionsSchema.parse(json.data);
}

export function useFeedbackOptions(restaurantId: string | null) {
  return useQuery({
    queryKey: ['feedback-options', restaurantId],
    enabled: Boolean(restaurantId),
    queryFn: () => fetchFeedbackOptions(restaurantId as string),
  });
}
