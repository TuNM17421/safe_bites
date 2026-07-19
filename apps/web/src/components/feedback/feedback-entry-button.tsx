'use client';
import { MessageCirclePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Public CTA that routes to the feedback wizard. Only restaurant/menu/dish ids ever reach the
// URL — never any profile or reaction data.
export function FeedbackEntryButton({
  restaurantId,
  menuItemId,
  dishId,
  variant = 'restaurant',
}: {
  restaurantId: string;
  menuItemId?: string | null;
  dishId?: string | null;
  variant?: 'restaurant' | 'menuItem';
}) {
  const t = useTranslations('feedback');
  const params = new URLSearchParams();
  params.set('restaurantId', restaurantId);
  if (menuItemId) params.set('menuItemId', menuItemId);
  if (dishId) params.set('dishId', dishId);

  return (
    <Link
      href={`/feedback/new?${params.toString()}`}
      className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-sm border border-sb-border bg-sb-surface-2 px-4 text-sb-body-s font-bold text-sb-fg focus-visible:shadow-sb-focus"
    >
      <MessageCirclePlus className="size-4" aria-hidden />
      {t(variant === 'menuItem' ? 'entry.iAteThis' : 'entry.share')}
    </Link>
  );
}
