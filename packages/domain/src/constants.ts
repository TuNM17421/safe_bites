import type { Bilingual, LanguageCode, RecommendationStatus, RiskLevel, Severity } from './types';

// §8.1 — higher rank = more cautious; the engine returns the highest-ranked status.
export const STATUS_RANK: Record<RecommendationStatus, number> = {
  suitable: 1,
  unknown: 2,
  ask_first: 3,
  risky: 4,
  avoid: 5,
};

export const RISK_LEVELS: readonly RiskLevel[] = [
  'contains',
  'likely_contains',
  'possible',
  'unlikely',
  'unknown',
];

// §8.2 allergy mapping: riskLevel -> status, split by conservative column.
// Conservative = severity severe/anaphylaxis OR cross-contact sensitive.
export const ALLERGY_TABLE: Record<RiskLevel, { normal: RecommendationStatus; conservative: RecommendationStatus }> = {
  contains: { normal: 'avoid', conservative: 'avoid' },
  likely_contains: { normal: 'avoid', conservative: 'avoid' },
  possible: { normal: 'ask_first', conservative: 'risky' },
  unlikely: { normal: 'suitable', conservative: 'ask_first' },
  unknown: { normal: 'unknown', conservative: 'unknown' },
};

// §8.3 religious constraint mapping (pork/alcohol/beef). A missing fact is treated
// as riskLevel 'unknown' -> ask_first (conservative, never suitable).
export const CONSTRAINT_TABLE: Record<RiskLevel, RecommendationStatus> = {
  contains: 'avoid',
  likely_contains: 'avoid',
  possible: 'ask_first',
  unlikely: 'suitable',
  unknown: 'ask_first',
};

// §8.4 confidence thresholds.
export const CONFIDENCE_HIGH = 0.8;
export const CONFIDENCE_MEDIUM = 0.55;

export const SEVERITY_RANK: Record<Severity, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  anaphylaxis_risk: 4,
};

export const SEVERITY_WORD: Record<LanguageCode, Record<Severity, string>> = {
  en: { mild: 'mild', moderate: 'moderate', severe: 'severe', anaphylaxis_risk: 'severe' },
  vi: { mild: 'nhẹ', moderate: 'vừa', severe: 'nặng', anaphylaxis_risk: 'nặng' },
};

// §8.3 picky-eater flags that warrant an Ask First.
export const PICKY_FLAGS: readonly string[] = [
  'strong_smell',
  'fermented_sauce',
  'offal_possible',
  'strong_broth',
];

// Profile template -> rule wiring.
export const RELIGIOUS_CONSTRAINTS: Record<string, readonly string[]> = {
  profile_muslim_halal: ['pork', 'alcohol'],
  profile_hindu_no_beef: ['beef'],
};
export const CALORIE_PROFILE_ID = 'profile_weight_loss';
export const PICKY_PROFILE_ID = 'profile_picky_eater';

type Copy = { reason: Bilingual; action: Bilingual };

export const CALORIE_COPY: Record<'high' | 'ok' | 'unknown', Copy> = {
  high: {
    reason: { en: 'This dish tends to be high in calories.', vi: 'Món này thường nhiều calo.' },
    action: { en: 'Ask about portion size or a lighter option.', vi: 'Hỏi về khẩu phần hoặc lựa chọn nhẹ hơn.' },
  },
  ok: {
    reason: { en: 'This dish is not high in calories.', vi: 'Món này không nhiều calo.' },
    action: { en: 'Enjoy in your usual portion.', vi: 'Dùng với khẩu phần thông thường.' },
  },
  unknown: {
    reason: { en: 'Calorie information is not available for this dish.', vi: 'Chưa có thông tin calo cho món này.' },
    action: { en: 'Ask staff how it is prepared.', vi: 'Hỏi nhân viên về cách chế biến.' },
  },
};

export const PICKY_COPY: Record<'flagged' | 'ok', Copy> = {
  flagged: {
    reason: { en: 'This dish may have strong flavors, textures, or spice.', vi: 'Món này có thể có mùi, kết cấu, hoặc độ cay mạnh.' },
    action: { en: 'Ask about ingredients you may want to avoid.', vi: 'Hỏi về các thành phần bạn có thể muốn tránh.' },
  },
  ok: {
    reason: { en: 'No strong-flavor or spicy flags for this dish.', vi: 'Món này không có dấu hiệu mùi mạnh hay cay.' },
    action: { en: 'Enjoy the dish.', vi: 'Thưởng thức món ăn.' },
  },
};

export const UNKNOWN_ALLERGEN_COPY: Copy = {
  reason: { en: 'There is no allergen information recorded for this dish.', vi: 'Chưa có thông tin dị ứng được ghi nhận cho món này.' },
  action: { en: 'Ask staff to confirm before ordering.', vi: 'Hỏi nhân viên để xác nhận trước khi gọi món.' },
};

export const CONSTRAINT_UNKNOWN_COPY: Copy = {
  reason: { en: 'We cannot confirm this ingredient for this dish.', vi: 'Không thể xác nhận thành phần này cho món.' },
  action: { en: 'Ask staff before ordering.', vi: 'Hỏi nhân viên trước khi gọi món.' },
};

export const NO_CONSTRAINT_COPY: Copy = {
  reason: { en: 'No selected constraints apply to this dish.', vi: 'Không có ràng buộc nào được chọn áp dụng cho món này.' },
  action: { en: 'Confirm with staff if anything is unclear.', vi: 'Xác nhận với nhân viên nếu có điều gì chưa rõ.' },
};

// Canonical allergen catalog — the single source of truth for the Allergen table
// (imported by prisma/seed.ts) and onboarding. Includes tree-nut/soy even though no
// seed dish carries their risk columns, so those resolve to an honest Unknown.
export const ALLERGEN_CATALOG = [
  { id: 'peanut', nameEn: 'Peanut', nameVi: 'Đậu phộng', kind: 'allergen' },
  { id: 'treenut', nameEn: 'Tree nut', nameVi: 'Hạt cây', kind: 'allergen' },
  { id: 'shellfish', nameEn: 'Shellfish', nameVi: 'Hải sản giáp xác', kind: 'allergen' },
  { id: 'fish', nameEn: 'Fish', nameVi: 'Cá', kind: 'allergen' },
  { id: 'wheat', nameEn: 'Wheat (gluten)', nameVi: 'Lúa mì (gluten)', kind: 'allergen' },
  { id: 'milk', nameEn: 'Milk', nameVi: 'Sữa', kind: 'allergen' },
  { id: 'egg', nameEn: 'Egg', nameVi: 'Trứng', kind: 'allergen' },
  { id: 'soy', nameEn: 'Soy', nameVi: 'Đậu nành', kind: 'allergen' },
  { id: 'sesame', nameEn: 'Sesame', nameVi: 'Vừng (mè)', kind: 'allergen' },
  { id: 'pork', nameEn: 'Pork', nameVi: 'Thịt heo', kind: 'constraint' },
  { id: 'beef', nameEn: 'Beef', nameVi: 'Thịt bò', kind: 'constraint' },
  { id: 'alcohol', nameEn: 'Alcohol', nameVi: 'Rượu/cồn', kind: 'constraint' },
  { id: 'high_calorie', nameEn: 'High calorie', nameVi: 'Nhiều calo', kind: 'constraint' },
  { id: 'strong_smell', nameEn: 'Strong smell', nameVi: 'Mùi mạnh', kind: 'constraint' },
] as const;
