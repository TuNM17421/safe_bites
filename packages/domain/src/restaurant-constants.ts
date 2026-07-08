// Restaurant/menu evaluator constants (spec §7.4/§7.6/§7.7). Copy is conservative and
// passes copy:check — no "safe"/"guaranteed" claims. Bilingual EN/VI.

import type { Bilingual } from './types';
import type { RestaurantReadinessClass } from './restaurant-types';

type Copy = { reason: Bilingual; action: Bilingual };

// Fallback when a menu item has no explicit allergen evidence and no mapped dish.
export const MENU_UNKNOWN_COPY: Copy = {
  reason: {
    en: 'There is no verified allergy information for this menu item yet.',
    vi: 'Chưa có thông tin dị ứng được xác minh cho món này.',
  },
  action: {
    en: 'Ask staff about ingredients and cross-contact before ordering.',
    vi: 'Hỏi nhân viên về thành phần và nguy cơ dùng chung dụng cụ trước khi gọi món.',
  },
};

// Action bound when an otherwise-low-risk item is not verified enough to call Suitable.
export const MENU_ASK_ACTION: Bilingual = {
  en: 'Ask staff about ingredients and cross-contact before ordering.',
  vi: 'Hỏi nhân viên về thành phần và nguy cơ dùng chung dụng cụ trước khi gọi món.',
};

// Discovery-only restaurant (OSM/OpenMap, no menu allergy data) — capped at readiness C.
export const DISCOVERY_ONLY_SUMMARY: Bilingual = {
  en: 'Menu allergy data is not available yet. Use this listing for discovery only and ask staff before ordering.',
  vi: 'Chưa có dữ liệu dị ứng từ thực đơn. Chỉ nên dùng thông tin này để tham khảo địa điểm và hỏi nhân viên trước khi gọi món.',
};

export const READINESS_SUMMARY: Record<RestaurantReadinessClass, Bilingual> = {
  A: {
    en: 'This restaurant has verified menu items that look lower risk for this profile. Please still confirm with staff before ordering.',
    vi: 'Nhà hàng này có món đã được xác minh và có vẻ ít rủi ro hơn với hồ sơ này. Vẫn nên xác nhận với nhân viên trước khi gọi món.',
  },
  B: {
    en: 'Some menu items look lower risk for this profile, but please ask staff before ordering.',
    vi: 'Một số món có vẻ ít rủi ro hơn với hồ sơ này, nhưng hãy hỏi nhân viên trước khi gọi món.',
  },
  C: {
    en: 'There is not enough allergy or menu data for this restaurant yet. Ask staff before ordering.',
    vi: 'Chưa đủ dữ liệu dị ứng hoặc thực đơn cho nhà hàng này. Hãy hỏi nhân viên trước khi gọi món.',
  },
  D: {
    en: 'Most menu items look higher risk for this profile. Take extra care and ask staff before ordering.',
    vi: 'Phần lớn các món có vẻ rủi ro cao hơn với hồ sơ này. Hãy cẩn trọng và hỏi nhân viên trước khi gọi món.',
  },
  E: {
    en: 'The known menu items look higher risk for this profile. Consider another option and ask staff before ordering.',
    vi: 'Các món đã biết có vẻ rủi ro cao hơn với hồ sơ này. Hãy cân nhắc lựa chọn khác và hỏi nhân viên trước khi gọi món.',
  },
};

export const STALE_REASON: Bilingual = {
  en: 'This information has not been checked recently and may be out of date.',
  vi: 'Thông tin này chưa được kiểm tra gần đây và có thể đã lỗi thời.',
};

// §7.7 freshness thresholds in days, keyed by source/verification type. Discovery freshness
// only — OSM/OpenMap is never treated as allergy verification regardless of age.
export const STALENESS_DAYS: Record<string, number> = {
  admin_verified: 60,
  restaurant_submitted: 30,
  official_menu: 45,
  admin_manual: 45,
  menu_observed: 45,
  openstreetmap: 90,
  openmapvn: 90,
  discovery: 90,
};

export const DEFAULT_STALENESS_DAYS = 45;
