import type { LanguageCode } from './types';

type StatusKey = 'suitable' | 'ask_first' | 'risky' | 'avoid' | 'unknown';

interface CopyBundle {
  safetyDisclaimer: string;
  offlineNotice: string;
  suitableCaveat: string;
  statuses: Record<StatusKey, string>;
}

// Canonical safety strings (spec §14). apps/web mirrors these keys into its
// next-intl messages; the risk engine binds `suitableCaveat` onto every
// Suitable result so the caveat can never be dropped by the UI.
export const copy: Record<LanguageCode, CopyBundle> = {
  en: {
    safetyDisclaimer:
      'This app helps you understand possible allergy risks. It cannot guarantee food safety. Always confirm ingredients and preparation with restaurant staff before ordering.',
    offlineNotice:
      'You are offline. Showing saved information only. Please confirm with restaurant staff before ordering.',
    suitableCaveat:
      'This looks lower risk for your profile, but please confirm with staff before ordering.',
    statuses: { suitable: 'Suitable', ask_first: 'Ask First', risky: 'Risky', avoid: 'Avoid', unknown: 'Unknown' },
  },
  vi: {
    safetyDisclaimer:
      'Ứng dụng giúp bạn hiểu các rủi ro dị ứng có thể có. Ứng dụng không thể đảm bảo an toàn thực phẩm. Luôn xác nhận thành phần và cách chế biến với nhân viên nhà hàng trước khi gọi món.',
    offlineNotice:
      'Bạn đang ngoại tuyến. Chỉ hiển thị thông tin đã lưu. Vui lòng xác nhận với nhân viên nhà hàng trước khi gọi món.',
    suitableCaveat:
      'Món này có vẻ rủi ro thấp hơn với hồ sơ của bạn, nhưng hãy xác nhận với nhân viên trước khi gọi món.',
    statuses: { suitable: 'Phù hợp hơn', ask_first: 'Hỏi trước', risky: 'Rủi ro', avoid: 'Nên tránh', unknown: 'Chưa rõ' },
  },
};
