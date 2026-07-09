'use client';
import type { DishRecommendationCard, LanguageCode } from '@safebite/domain';
import { RecommendationCard } from '@/components/safety/recommendation-card';
import { Link } from '@/i18n/navigation';

// List item: the whole evidence card links to the dish detail page. `showSubtitle` leads with
// the native dish name and the translated subtitle.
export function DishCard({ card, lang }: { card: DishRecommendationCard; lang: LanguageCode }) {
  return (
    <Link href={`/dishes/${card.dishId}`} className="block rounded-sb-md focus-visible:shadow-sb-focus">
      <RecommendationCard card={card} lang={lang} showSubtitle morphName={`dish-title-${card.dishId}`} />
    </Link>
  );
}
