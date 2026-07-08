'use client';
import { useCallback, useEffect, useState } from 'react';
import type { LanguageCode, LocalUserProfile, QuestionCardRecord } from '@safebite/domain';
import { useOnlineStatus } from '@/components/app-shell/use-online-status';
import { questionCardRepo, savedDishRepo } from '@/lib/local-repo';
import { fetchQuestionCard, regenQuestionCard } from './question-card-client';
import { loadCachedAllergens, toQuestionCardAllergens } from './use-allergens';

interface Input {
  profile: LocalUserProfile | null;
  targetLanguage: LanguageCode;
  dishId?: string;
  includeDish: boolean;
}

export interface QuestionCardResult {
  card: QuestionCardRecord | null;
  generate: () => void;
  isGenerating: boolean;
  source: 'live' | 'saved' | null;
  error: string | null;
}

async function resolveDishName(dishId: string): Promise<{ en: string; vi: string } | undefined> {
  const saved = await savedDishRepo.getSavedDish(dishId);
  return saved ? { en: saved.name.en, vi: saved.name.vi } : undefined;
}

export function useQuestionCard({ profile, targetLanguage, dishId, includeDish }: Input): QuestionCardResult {
  const online = useOnlineStatus();
  const [card, setCard] = useState<QuestionCardRecord | null>(null);
  const [source, setSource] = useState<'live' | 'saved' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!profile) return;
    setIsGenerating(true);
    setError(null);
    const effectiveDishId = includeDish ? dishId : undefined;
    try {
      if (online) {
        const record = await fetchQuestionCard({
          profile: {
            id: profile.id,
            selectedProfileIds: profile.selectedProfileIds,
            allergies: profile.allergies,
            language: profile.language,
            destinationCity: profile.destinationCity,
          },
          dishId: effectiveDishId,
          targetLanguage,
        });
        await questionCardRepo.saveLastQuestionCard(record);
        setCard(record);
        setSource('live');
        return;
      }
      // Offline: regenerate from cached allergens, else fall back to the last saved card.
      const items = await loadCachedAllergens();
      if (items.length > 0) {
        const allergens = toQuestionCardAllergens(
          items,
          profile.allergies.map((a) => a.allergenId),
        );
        const dishName = effectiveDishId ? await resolveDishName(effectiveDishId) : undefined;
        const record = regenQuestionCard(
          { profile, allergens, targetLanguage, dishName },
          { id: `qc_${crypto.randomUUID()}`, profileId: profile.id, dishId: effectiveDishId, createdAt: new Date().toISOString() },
        );
        await questionCardRepo.saveLastQuestionCard(record);
        setCard(record);
        setSource('live');
      } else {
        const saved = await questionCardRepo.loadLastQuestionCard();
        setCard(saved ?? null);
        setSource(saved ? 'saved' : null);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsGenerating(false);
    }
  }, [profile, targetLanguage, dishId, includeDish, online]);

  useEffect(() => {
    void generate();
  }, [generate]);

  return { card, generate, isGenerating, source, error };
}
