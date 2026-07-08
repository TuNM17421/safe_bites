// Shared domain types (spec §7) plus the engine/question-card inputs.

export type LanguageCode = 'en' | 'vi';

export type Severity = 'mild' | 'moderate' | 'severe' | 'anaphylaxis_risk';

export type RiskLevel = 'contains' | 'likely_contains' | 'possible' | 'unlikely' | 'unknown';

export type RecommendationStatus = 'suitable' | 'ask_first' | 'risky' | 'avoid' | 'unknown';

export type ConfidenceLabel = 'low' | 'medium' | 'high';

export type EvidenceType =
  | 'manual_seed'
  | 'canonical_recipe'
  | 'menu_observed'
  | 'restaurant_verified'
  | 'user_report'
  | 'llm_inferred';

export type Bilingual = Record<LanguageCode, string>;

export interface LocalUserProfile {
  id: string;
  name?: string;
  selectedProfileIds: string[];
  allergies: Array<{
    allergenId: string;
    severity: Severity;
    crossContactSensitive: boolean | 'not_sure';
  }>;
  language: LanguageCode;
  destinationCity: string;
  safetyAcceptedAt: string;
  offlineEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DishRiskFact {
  dishId: string;
  allergenId: string;
  riskLevel: RiskLevel;
  confidence: number;
  reason: Bilingual;
  recommendedAction: Bilingual;
  evidenceType: EvidenceType;
  source: string;
  lastCheckedAt: string;
}

export interface DishRecommendationCard {
  dishId: string;
  name: Bilingual;
  status: RecommendationStatus;
  riskLevel: RiskLevel;
  confidence: ConfidenceLabel;
  reason: Bilingual;
  action: Bilingual;
  source: string;
  lastCheckedAt: string;
  matchedAllergens: string[];
  stale?: boolean;
}

export interface DishEvaluationInput {
  dishId: string;
  name: Bilingual;
  risks: DishRiskFact[];
  calorieClass?: string;
  spicyLevel?: string;
  pickyEaterFlags: string[];
}

export type QuestionCardKind =
  | 'severity_statement'
  | 'ingredient_question'
  | 'cross_contact_question'
  | 'kitchen_check';

export interface QuestionCardSection {
  kind: QuestionCardKind;
  text: string;
}

export interface QuestionCard {
  targetLanguage: LanguageCode;
  text: string;
  sections: QuestionCardSection[];
  allergenIds: string[];
  dishName?: Bilingual;
}

export interface QuestionCardAllergen {
  id: string;
  nameVi: string;
  nameEn: string;
  aliasesVi: string[];
  aliasesEn: string[];
}

export interface QuestionCardInput {
  profile: LocalUserProfile;
  allergens: QuestionCardAllergen[];
  targetLanguage: LanguageCode;
  dishName?: Bilingual;
}
