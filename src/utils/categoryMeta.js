import { Ionicons } from '@expo/vector-icons';
import { getLanguage, t } from '../i18n';
import { formatNumber } from '../i18n/format';

// Visual identity for each service category (icon, colors, profession title).
// Categories themselves come from the API (/categories, managed in the admin
// dashboard); this only decides how a known key looks in the app.
const PLUMBING = { label: t('category.PLUMBING'), icon: 'faucet', lib: 'mci', color: '#1a73e8', bg: '#e8f1fe', gradient: ['#4f9cff', '#1a5fe0'], profession: t('profession.PLUMBING') };
const HANDYMAN = { label: t('category.HANDYMAN'), icon: 'tools', lib: 'mci', color: '#f97316', bg: '#fff0e3', gradient: ['#ffb057', '#f26a1b'], profession: t('profession.HANDYMAN') };
const ELECTRICAL = { label: t('category.ELECTRICAL'), icon: 'lightning-bolt', lib: 'mci', color: '#f5b400', bg: '#fff6dc', gradient: ['#ffd84d', '#f59e0b'], profession: t('profession.ELECTRICAL') };
const HVAC = { label: t('category.HVAC'), icon: 'snowflake', lib: 'mci', color: '#0ea5e9', bg: '#e6f4fd', gradient: ['#67d8ff', '#0b8fd8'], profession: t('profession.HVAC') };
const PAINTING = { label: t('category.PAINTING'), icon: 'format-paint', lib: 'mci', color: '#ec4868', bg: '#fdebef', gradient: ['#ff7aa2', '#e0315f'], profession: t('profession.PAINTING') };
const CLEANING = { label: t('category.CLEANING'), icon: 'broom', lib: 'mci', color: '#10b981', bg: '#e3f8f0', gradient: ['#4fe3b4', '#0e9f74'], profession: t('profession.CLEANING') };
const TRANSPORT = { label: t('category.TRANSPORT'), icon: 'truck-fast', lib: 'mci', color: '#6d4aff', bg: '#efeaff', gradient: ['#a08bff', '#5b3df0'], profession: t('profession.TRANSPORT') };
const GARDENING = { label: t('category.GARDENING'), icon: 'sprout', lib: 'mci', color: '#16a34a', bg: '#e5f6ea', gradient: ['#7ee06a', '#23a043'], profession: t('profession.GARDENING') };

// Keys are generated from the category name when it is created in the dashboard
// and never change, so a category keeps its original key after a rename
// (e.g. "Serrurerie" renamed "Transporteur" is still LOCKSMITH, and the cleaning
// category is still ELECTRICITE).
const META = {
  PLUMBING, PLOMBERIE: PLUMBING,
  HANDYMAN, BRICOLAGE: HANDYMAN,
  ELECTRICAL,
  HVAC, CLIMATISATION: HVAC,
  PAINTING, PEINTURE: PAINTING,
  CLEANING, NETTOYAGE: CLEANING, ELECTRICITE: CLEANING,
  TRANSPORT, TRANSPORTEUR: TRANSPORT, LOCKSMITH: TRANSPORT,
  GARDENING, JARDINAGE: GARDENING, JARDINIER: GARDENING,
  APPLIANCE: { label: t('category.APPLIANCE'), icon: 'washing-machine', lib: 'mci', color: '#2563eb', bg: '#e8effd', profession: t('profession.APPLIANCE') },
  CARPENTRY: { label: t('category.CARPENTRY'), icon: 'hammer', lib: 'mci', color: '#a16207', bg: '#f8efe1', profession: t('profession.CARPENTRY') },
};

// Fallback for categories created in the dashboard that the app doesn't know yet.
export const categoryMeta = (key, apiCategory) => {
  const known = META[String(key || '').toUpperCase()];
  if (known) return known;
  const color = apiCategory?.color || '#1a56db';
  // Dashboard icons use another icon set; fall back when Ionicons lacks the name
  const icon = apiCategory?.icon && Ionicons.glyphMap?.[apiCategory.icon] ? apiCategory.icon : 'construct';
  return {
    icon,
    lib: 'ionicons',
    color,
    bg: color + '1a',
    gradient: [color + 'b3', color],
    label: apiCategory?.name || t('common.service'),
    profession: apiCategory?.name || t('common.technician'),
  };
};

// A category's display name. French keeps the name set in the dashboard, so a
// rename shows right away; other languages use the app's translation of the
// categories it knows and fall back to that name.
export const categoryName = (key, name) => {
  if (name && getLanguage() === 'fr') return name;
  return META[String(key || '').toUpperCase()]?.label || name;
};

// `fallbackName` (usually the service's own name) covers categories the app
// doesn't know, e.g. ones created later in the dashboard.
export const professionTitle = (key, fallbackName) => {
  const meta = META[String(key || '').toUpperCase()];
  const name = meta?.profession || fallbackName;
  return name ? t('profession.withTitle', { name }) : t('profession.default');
};

// "adem benslama" -> "Adem Benslama"
export const titleCase = (name) =>
  String(name || '').replace(/(^|\s)(\S)/g, (m, space, ch) => space + ch.toUpperCase());

// "Karim Ben Salah" -> "Karim B."
export const shortName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || t('common.technician');
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

export const formatDistance = (km) => {
  if (typeof km !== 'number') return null;
  return km < 1
    ? t('common.meters', { value: Math.round(km * 1000) })
    : t('common.kilometers', { value: formatNumber(km, 1) });
};
