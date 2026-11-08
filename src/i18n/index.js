import 'intl-pluralrules/polyfill';
import { Alert, I18nManager, Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import i18next from 'i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fil from './locales/fil.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import hi from './locales/hi.json';
import ur from './locales/ur.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import { alignTextForRTL } from './rtlText';

const STORAGE_KEY = 'language';
// Set while the app reloads to change direction, so a device that keeps the
// old direction can't reload forever
const DIRECTION_RELOAD_KEY = 'languageDirectionReload';

const DEFAULT_LANGUAGE = 'fr';

// Each language's own name, shown as it is whatever the app's language
export const LANGUAGES = [
  { code: 'fr', label: 'Français', strings: fr },
  { code: 'en', label: 'English', strings: en },
  { code: 'ar', label: 'العربية', strings: ar },
  { code: 'de', label: 'Deutsch', strings: de },
  { code: 'es', label: 'Español', strings: es },
  { code: 'fil', label: 'Filipino', strings: fil },
  { code: 'it', label: 'Italiano', strings: it },
  { code: 'pt', label: 'Português', strings: pt },
  { code: 'tr', label: 'Türkçe', strings: tr },
  { code: 'ru', label: 'Русский', strings: ru },
  { code: 'hi', label: 'हिन्दी', strings: hi },
  { code: 'ur', label: 'اردو', strings: ur },
  { code: 'zh-Hans', label: '简体中文', strings: zhHans },
  { code: 'zh-Hant', label: '繁體中文', strings: zhHant },
  { code: 'ja', label: '日本語', strings: ja },
  { code: 'ko', label: '한국어', strings: ko },
];

// Languages written right to left, which flip the whole layout
const RTL_LANGUAGES = ['ar', 'ur'];

const isSupported = (code) => LANGUAGES.some((language) => language.code === code);

// "zh-Hant-TW", "zh_TW_#Hant", "tl_PH"... -> one of the app's codes
const appCode = (tag) => {
  const parts = String(tag || '').replace(/_/g, '-').toLowerCase().split('-').map((part) => part.replace('#', ''));
  if (parts[0] === 'zh') {
    return parts.some((part) => ['hant', 'tw', 'hk', 'mo'].includes(part)) ? 'zh-Hant' : 'zh-Hans';
  }
  if (parts[0] === 'tl') return 'fil';
  return parts[0];
};

const deviceLanguage = () => appCode(Platform.OS === 'ios'
  ? Settings.get('AppleLanguages')?.[0]
  : I18nManager.getConstants().localeIdentifier);

export const t = (key, params) => i18next.t(key, params);

export const getLanguage = () => i18next.language || DEFAULT_LANGUAGE;

export const languageLabel = () => LANGUAGES.find((language) => language.code === getLanguage())?.label;

// Asks the phone for the right layout direction, which only applies after a
// reload. Returns true when the app is reloading.
const syncDirection = async (language) => {
  const rtl = RTL_LANGUAGES.includes(language);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  if (I18nManager.isRTL === rtl) {
    await AsyncStorage.removeItem(DIRECTION_RELOAD_KEY);
    return false;
  }
  if (await AsyncStorage.getItem(DIRECTION_RELOAD_KEY)) return false;
  await AsyncStorage.setItem(DIRECTION_RELOAD_KEY, '1');
  await reloadAppAsync();
  return true;
};

// The saved choice, else the phone's language, else French. Resolves to false
// when the app is about to reload to switch direction.
export const initLanguage = async () => {
  const saved = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const device = deviceLanguage();
  const language = isSupported(saved) ? saved : isSupported(device) ? device : DEFAULT_LANGUAGE;

  await i18next.init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    resources: Object.fromEntries(LANGUAGES.map(({ code, strings }) => [code, { translation: strings }])),
    interpolation: { escapeValue: false },
    nsSeparator: false,
  });

  const reloading = await syncDirection(language).catch(() => false);
  alignTextForRTL();
  return !reloading;
};

// Reloads the app, which rebuilds every screen in the new language
export const setLanguage = async (language) => {
  if (language === getLanguage()) return;
  await AsyncStorage.setItem(STORAGE_KEY, language);
  const rtl = RTL_LANGUAGES.includes(language);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  try {
    await reloadAppAsync();
  } catch (error) {
    Alert.alert(t('common.restartFailedTitle'), t('common.restartFailed'));
  }
};
