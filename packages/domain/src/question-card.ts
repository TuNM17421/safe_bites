import { SEVERITY_RANK, SEVERITY_WORD } from './constants';
import type { LanguageCode, QuestionCard, QuestionCardInput, QuestionCardSection, Severity } from './types';
import { distinct } from './util';

const CONNECTOR: Record<LanguageCode, string> = { en: 'or', vi: 'hoặc' };

const KITCHEN_CHECK: Record<LanguageCode, string> = {
  en: 'If unsure, could you please check with the kitchen?',
  vi: 'Nếu không chắc, anh/chị có thể hỏi bếp giúp tôi không?',
};

function joinList(items: string[], lang: LanguageCode): string {
  const parts = items.filter((s) => s.length > 0);
  if (parts.length <= 1) return parts.join('');
  const connector = CONNECTOR[lang];
  const last = parts[parts.length - 1] ?? '';
  if (parts.length === 2) return `${parts[0] ?? ''} ${connector} ${last}`;
  return `${parts.slice(0, -1).join(', ')}, ${connector} ${last}`;
}

function severityStatement(lang: LanguageCode, sevWord: string, names: string[], nameList: string): string {
  if (lang === 'vi') return `Tôi bị dị ứng ${sevWord} với ${nameList}.`;
  if (names.length === 1) return `I have a ${sevWord} ${names[0] ?? ''} allergy.`;
  return `I have a ${sevWord} allergy to ${nameList}.`;
}

// Names the specific dish/menu item when provided (§15 menu context); otherwise generic.
function ingredientQuestion(lang: LanguageCode, list: string, itemName?: string): string {
  if (itemName) {
    return lang === 'vi' ? `${itemName} có ${list} không?` : `Does ${itemName} contain ${list}?`;
  }
  return lang === 'vi' ? `Món này có ${list} không?` : `Does this dish contain ${list}?`;
}

function crossContactQuestion(lang: LanguageCode, nameList: string): string {
  return lang === 'vi'
    ? `Món này có dùng chung chảo, dao thớt, hoặc dầu chiên với món có ${nameList} không?`
    : `Is it prepared with shared cookware, cutting boards, or fryer oil used for ${nameList} dishes?`;
}

// Deterministic bilingual question card (spec §15). No LLM; exact-string testable.
export function buildQuestionCard(input: QuestionCardInput): QuestionCard {
  const { profile, allergens, targetLanguage: lang, dishName } = input;
  const byId = new Map(allergens.map((a) => [a.id, a]));

  const selected = profile.allergies
    .map((allergy) => ({ allergy, detail: byId.get(allergy.allergenId) }))
    .filter((x): x is { allergy: (typeof profile.allergies)[number]; detail: NonNullable<typeof x.detail> } =>
      Boolean(x.detail),
    );

  // Allergen names are common nouns used mid-sentence -> lowercase for grammatical copy.
  const names = selected.map((s) => (lang === 'vi' ? s.detail.nameVi : s.detail.nameEn).toLowerCase());
  const containsTerms = distinct(
    selected.flatMap((s) => {
      const aliases = lang === 'vi' ? s.detail.aliasesVi : s.detail.aliasesEn;
      return aliases.length > 0 ? aliases : [lang === 'vi' ? s.detail.nameVi : s.detail.nameEn];
    }),
  );
  const highestSeverity = selected.reduce<Severity>(
    (acc, s) => (SEVERITY_RANK[s.allergy.severity] > SEVERITY_RANK[acc] ? s.allergy.severity : acc),
    'mild',
  );
  const anyCrossContact = selected.some(
    (s) => s.allergy.crossContactSensitive === true || s.allergy.crossContactSensitive === 'not_sure',
  );

  const nameList = joinList(names, lang);
  const itemName = dishName ? dishName[lang] : undefined;
  const sections: QuestionCardSection[] = [
    { kind: 'severity_statement', text: severityStatement(lang, SEVERITY_WORD[lang][highestSeverity], names, nameList) },
    { kind: 'ingredient_question', text: ingredientQuestion(lang, joinList(containsTerms, lang), itemName) },
  ];
  if (anyCrossContact) {
    sections.push({ kind: 'cross_contact_question', text: crossContactQuestion(lang, nameList) });
  }
  sections.push({ kind: 'kitchen_check', text: KITCHEN_CHECK[lang] });

  return {
    targetLanguage: lang,
    text: sections.map((s) => s.text).join('\n\n'),
    sections,
    allergenIds: selected.map((s) => s.allergy.allergenId),
    dishName,
  };
}
