import { Ionicons } from '@expo/vector-icons';

// Visual identity for each service category (icon, colors, profession title).
// Categories themselves come from the API (/categories, managed in the admin
// dashboard); this only decides how a known key looks in the app.
const PLUMBING = { label: 'Plomberie', icon: 'faucet', lib: 'mci', color: '#1a73e8', bg: '#e8f1fe', gradient: ['#4f9cff', '#1a5fe0'], profession: 'Plombier' };
const HANDYMAN = { label: 'Bricolage', icon: 'tools', lib: 'mci', color: '#f97316', bg: '#fff0e3', gradient: ['#ffb057', '#f26a1b'], profession: 'Bricoleur' };
const ELECTRICAL = { label: 'Électricité', icon: 'lightning-bolt', lib: 'mci', color: '#f5b400', bg: '#fff6dc', gradient: ['#ffd84d', '#f59e0b'], profession: 'Électricien' };
const HVAC = { label: 'Climatisation', icon: 'snowflake', lib: 'mci', color: '#0ea5e9', bg: '#e6f4fd', gradient: ['#67d8ff', '#0b8fd8'], profession: 'Frigoriste' };
const PAINTING = { label: 'Peinture', icon: 'format-paint', lib: 'mci', color: '#ec4868', bg: '#fdebef', gradient: ['#ff7aa2', '#e0315f'], profession: 'Peintre' };
const CLEANING = { label: 'Nettoyage', icon: 'spray-bottle', lib: 'mci', color: '#10b981', bg: '#e3f8f0', gradient: ['#4fe3b4', '#0e9f74'], profession: 'Agent de nettoyage' };
const TRANSPORT = { label: 'Transporteur', icon: 'truck-fast', lib: 'mci', color: '#6d4aff', bg: '#efeaff', gradient: ['#a08bff', '#5b3df0'], profession: 'Transporteur' };
const GARDENING = { label: 'Jardinage', icon: 'sprout', lib: 'mci', color: '#16a34a', bg: '#e5f6ea', gradient: ['#7ee06a', '#23a043'], profession: 'Jardinier' };

// Keys are generated from the category name when it is created in the dashboard
// and never change, so a category keeps its original key after a rename
// (e.g. "Serrurerie" renamed "Transporteur" is still LOCKSMITH).
const META = {
  PLUMBING, PLOMBERIE: PLUMBING,
  HANDYMAN, BRICOLAGE: HANDYMAN,
  ELECTRICAL, ELECTRICITE: ELECTRICAL,
  HVAC, CLIMATISATION: HVAC,
  PAINTING, PEINTURE: PAINTING,
  CLEANING, NETTOYAGE: CLEANING,
  TRANSPORT, TRANSPORTEUR: TRANSPORT, LOCKSMITH: TRANSPORT,
  GARDENING, JARDINAGE: GARDENING, JARDINIER: GARDENING,
  APPLIANCE: { label: 'Électroménager', icon: 'washing-machine', lib: 'mci', color: '#2563eb', bg: '#e8effd', profession: 'Réparateur électroménager' },
  CARPENTRY: { label: 'Menuiserie', icon: 'hammer', lib: 'mci', color: '#a16207', bg: '#f8efe1', profession: 'Menuisier' },
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
    label: apiCategory?.name || 'Service',
    profession: apiCategory?.name || 'Technicien',
  };
};

// `fallbackName` (usually the service's own name) covers categories the app
// doesn't know, e.g. ones created later in the dashboard.
export const professionTitle = (key, fallbackName) => {
  const meta = META[String(key || '').toUpperCase()];
  if (meta) return `${meta.profession} professionnel`;
  return fallbackName ? `${fallbackName} professionnel` : 'Technicien professionnel';
};

// "adem benslama" -> "Adem Benslama"
export const titleCase = (name) =>
  String(name || '').replace(/(^|\s)(\S)/g, (m, space, ch) => space + ch.toUpperCase());

// "Karim Ben Salah" -> "Karim B."
export const shortName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || 'Technicien';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

export const formatDistance = (km) => {
  if (typeof km !== 'number') return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
};
