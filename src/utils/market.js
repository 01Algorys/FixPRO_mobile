import { I18nManager, Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FixPro works by country: a client only sees, and can only book, technicians
// of their own country. A signed-in user's country belongs to their account
// (the server sets it at sign-up, from the phone number). Before that, for
// guests and at sign-up, the app uses the phone's own country: where it is
// (GPS), else its time zone, else its region setting, else Tunisia.

const STORAGE_KEY = 'deviceCountry';
const FALLBACK = 'TN';

// Time zones that belong to one country. A hint only: phones in Tunisia are
// often set to the "France" region, but keep the Africa/Tunis time zone.
const ZONES = {
  'Africa/Tunis': 'TN', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA',
  'Africa/Tripoli': 'LY', 'Africa/Cairo': 'EG', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES', 'Europe/London': 'GB', 'Europe/Brussels': 'BE', 'Europe/Amsterdam': 'NL', 'Europe/Zurich': 'CH',
  'Europe/Lisbon': 'PT', 'Europe/Istanbul': 'TR', 'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Manila': 'PH', 'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Europe/Moscow': 'RU', 'America/Sao_Paulo': 'BR', 'America/Toronto': 'CA',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
};

// Currency shown with prices, by country (ISO 4217). Others show the number alone.
const EURO = ['FR', 'DE', 'IT', 'ES', 'PT', 'BE', 'NL', 'AT', 'IE', 'FI', 'GR', 'LU', 'MT', 'CY', 'SK', 'SI', 'EE', 'LV', 'LT', 'HR'];
const CURRENCIES = {
  TN: 'TND', DZ: 'DZD', MA: 'MAD', LY: 'LYD', EG: 'EGP', MR: 'MRU', SD: 'SDG', IN: 'INR', PK: 'PKR', BD: 'BDT',
  LK: 'LKR', NP: 'NPR', SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD', LB: 'LBP',
  IQ: 'IQD', TR: 'TRY', GB: 'GBP', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', BG: 'BGN', RU: 'RUB', UA: 'UAH', US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', CN: 'CNY', JP: 'JPY', KR: 'KRW', TW: 'TWD', HK: 'HKD', SG: 'SGD', MY: 'MYR', ID: 'IDR',
  TH: 'THB', VN: 'VND', PH: 'PHP', AU: 'AUD', NZ: 'NZD', ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS', ET: 'ETB',
  TZ: 'TZS', UG: 'UGX', CD: 'CDF', SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF',
  CM: 'XAF', GA: 'XAF', TD: 'XAF', CG: 'XAF',
  ...Object.fromEntries(EURO.map((code) => [code, 'EUR'])),
};

const isCode = (value) => /^[A-Z]{2}$/.test(value || '');

const fromTimeZone = () => {
  try {
    return ZONES[Intl.DateTimeFormat().resolvedOptions().timeZone] || null;
  } catch (error) {
    return null;
  }
};

// "fr_TN", "en-IN", "zh-Hant-TW" -> the region
const fromRegionSetting = () => {
  try {
    const tag = Platform.OS === 'ios'
      ? Settings.get('AppleLocale') || Settings.get('AppleLanguages')?.[0]
      : I18nManager.getConstants().localeIdentifier;
    const region = String(tag || '').replace(/_/g, '-').split('-').slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
    return region ? region.toUpperCase() : null;
  } catch (error) {
    return null;
  }
};

let deviceCountry = FALLBACK;
let accountCountry = null;

// Called once as the app starts, before any screen is built
export const initMarket = async () => {
  const located = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  deviceCountry = isCode(located) ? located : fromTimeZone() || fromRegionSetting() || FALLBACK;
};

// The country the phone is in, from its position. Kept for the next starts.
export const setDeviceCountry = (code) => {
  const next = String(code || '').toUpperCase();
  if (!isCode(next) || next === deviceCountry) return;
  deviceCountry = next;
  AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
};

// The signed-in user's country, or null when signed out
export const setAccountCountry = (code) => {
  accountCountry = isCode(code) ? code : null;
};

export const getDeviceCountry = () => deviceCountry;

// The country whose technicians and prices the app shows right now
export const getMarketCountry = () => accountCountry || deviceCountry;

export const marketCurrency = () => CURRENCIES[getMarketCountry()] || '';
