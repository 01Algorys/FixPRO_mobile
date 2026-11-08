import { I18nManager } from 'react-native';
import { getLanguage, t } from './index';

// Tunisian Arabic keeps Western digits and the local month names (جانفي, فيفري...)
const LOCALES = {
  fr: 'fr-FR',
  en: 'en-GB',
  ar: 'ar-TN',
  de: 'de-DE',
  es: 'es-ES',
  fil: 'fil-PH',
  it: 'it-IT',
  pt: 'pt-BR',
  tr: 'tr-TR',
  ru: 'ru-RU',
  hi: 'hi-IN',
  ur: 'ur-PK',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export const isRTL = I18nManager.isRTL;

export const locale = () => LOCALES[getLanguage()] || LOCALES.fr;

export const formatDate = (value, options) => new Date(value).toLocaleDateString(locale(), options);

export const formatTime = (value) =>
  new Date(value).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false });

// A fixed number of decimals when `digits` is given, else up to two (25.5 stays 25.5)
export const formatNumber = (value, digits) =>
  Number(value).toLocaleString(locale(), digits === undefined
    ? { maximumFractionDigits: 2 }
    : { minimumFractionDigits: digits, maximumFractionDigits: digits });

// A rating such as 4.5, with the language's decimal separator
export const formatRating = (value) => formatNumber(value || 0, 1);

export const formatPrice = (amount) => t('common.price', { amount: formatNumber(amount) });

// Keeps a phone number, email or code in reading order inside Arabic text
export const ltr = (text) => (isRTL && text ? `⁦${text}⁩` : text);

// A row that keeps its left-to-right order in every language, like the logo
export const fixedRow = { flexDirection: isRTL ? 'row-reverse' : 'row' };

const MIRRORED_ICONS = {
  'arrow-back': 'arrow-forward',
  'arrow-forward': 'arrow-back',
  'arrow-back-outline': 'arrow-forward-outline',
  'chevron-back': 'chevron-forward',
  'chevron-forward': 'chevron-back',
};

// The icon for a direction, swapped in right-to-left layouts
export const directional = (icon) => (isRTL ? MIRRORED_ICONS[icon] || icon : icon);
