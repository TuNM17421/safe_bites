import type { RiskLevel } from '@safebite/domain';

// §6.5 — the 10 dish `default_*_risk` columns mapped to canonical allergen ids.
// Note the aliasing: gluten -> wheat, dairy -> milk.
export const RISK_COLUMN_MAP = [
  { col: 'default_peanut_risk', allergenId: 'peanut' },
  { col: 'default_shellfish_risk', allergenId: 'shellfish' },
  { col: 'default_fish_risk', allergenId: 'fish' },
  { col: 'default_pork_risk', allergenId: 'pork' },
  { col: 'default_beef_risk', allergenId: 'beef' },
  { col: 'default_gluten_risk', allergenId: 'wheat' },
  { col: 'default_egg_risk', allergenId: 'egg' },
  { col: 'default_dairy_risk', allergenId: 'milk' },
  { col: 'default_sesame_risk', allergenId: 'sesame' },
  { col: 'default_alcohol_risk', allergenId: 'alcohol' },
] as const;

const CANONICAL: readonly RiskLevel[] = ['contains', 'likely_contains', 'possible', 'unlikely', 'unknown'];

/** Normalize a raw CSV risk value to the canonical RiskLevel; `likely` -> `likely_contains`;
 *  blank / off-vocabulary -> `unknown` (conservative, safe-by-default). */
export function normalizeRiskLevel(raw: string | undefined): RiskLevel {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'likely') return 'likely_contains';
  return (CANONICAL as readonly string[]).includes(v) ? (v as RiskLevel) : 'unknown';
}

export interface ReasonAction {
  reasonEn: string;
  reasonVi: string;
  recommendedActionEn: string;
  recommendedActionVi: string;
}

// Deterministic bilingual templates (§6.5). No LLM. No forbidden §16 copy, no
// `Suitable` label (status mapping is the risk engine's job). Unknown stays honest.
export function buildReasonAction(nameEn: string, nameVi: string, level: RiskLevel): ReasonAction {
  const en = nameEn.toLowerCase();
  const vi = nameVi.toLowerCase();
  switch (level) {
    case 'contains':
      return {
        reasonEn: `This dish typically contains ${en}.`,
        reasonVi: `Món này thường có ${vi}.`,
        recommendedActionEn: `Ask staff for a version without ${en}, or choose another dish.`,
        recommendedActionVi: `Hỏi nhân viên phiên bản không có ${vi}, hoặc chọn món khác.`,
      };
    case 'likely_contains':
      return {
        reasonEn: `This dish likely contains ${en}.`,
        reasonVi: `Món này nhiều khả năng có ${vi}.`,
        recommendedActionEn: `Confirm with staff whether ${en} is used before ordering.`,
        recommendedActionVi: `Xác nhận với nhân viên xem có dùng ${vi} không trước khi gọi món.`,
      };
    case 'possible':
      return {
        reasonEn: `${nameEn} may be present, depending on preparation.`,
        reasonVi: `${nameVi} có thể có, tùy cách chế biến.`,
        recommendedActionEn: `Ask staff whether this dish uses ${en}.`,
        recommendedActionVi: `Hỏi nhân viên món này có dùng ${vi} không.`,
      };
    case 'unlikely':
      return {
        reasonEn: `${nameEn} is not usually part of this dish.`,
        reasonVi: `${nameVi} thường không có trong món này.`,
        recommendedActionEn: `Still confirm with staff, especially about shared cookware.`,
        recommendedActionVi: `Vẫn nên xác nhận với nhân viên, nhất là về dụng cụ dùng chung.`,
      };
    default:
      return {
        reasonEn: `We do not have reliable data on ${en} for this dish.`,
        reasonVi: `Chưa có dữ liệu đáng tin về ${vi} cho món này.`,
        recommendedActionEn: `Treat as unknown and ask staff directly before ordering.`,
        recommendedActionVi: `Xem như chưa rõ và hỏi trực tiếp nhân viên trước khi gọi món.`,
      };
  }
}
