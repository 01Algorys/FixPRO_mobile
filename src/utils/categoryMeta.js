// Visual identity for each service category (icon, colors, profession title).
// Categories themselves come from the API (/categories, managed in the admin
// dashboard); this only decides how a known key looks in the app.
const META = {
  PLUMBING: { label: 'Plomberie', icon: 'water', lib: 'ionicons', color: '#1a73e8', bg: '#e8f1fe', profession: 'Plombier' },
  ELECTRICAL: { label: 'Électricité', icon: 'flash', lib: 'ionicons', color: '#f5b400', bg: '#fff6dc', profession: 'Électricien' },
  HVAC: { label: 'Climatisation', icon: 'snowflake', lib: 'mci', color: '#1a73e8', bg: '#e6f4fd', profession: 'Frigoriste' },
  LOCKSMITH: { label: 'Serrurerie', icon: 'key-variant', lib: 'mci', color: '#7c3aed', bg: '#f1eafe', profession: 'Serrurier' },
  PAINTING: { label: 'Peinture', icon: 'format-paint', lib: 'mci', color: '#ec4868', bg: '#fdebef', profession: 'Peintre' },
  HANDYMAN: { label: 'Bricolage', icon: 'tools', lib: 'mci', color: '#f97316', bg: '#fff0e3', profession: 'Bricoleur' },
  APPLIANCE: { label: 'Électroménager', icon: 'washing-machine', lib: 'mci', color: '#2563eb', bg: '#e8effd', profession: 'Réparateur électroménager' },
  CLEANING: { label: 'Nettoyage', icon: 'broom', lib: 'mci', color: '#10b981', bg: '#e3f8f0', profession: 'Agent de nettoyage' },
  GARDENING: { label: 'Jardinage', icon: 'leaf', lib: 'mci', color: '#16a34a', bg: '#e5f6ea', profession: 'Jardinier' },
  CARPENTRY: { label: 'Menuiserie', icon: 'hammer', lib: 'mci', color: '#a16207', bg: '#f8efe1', profession: 'Menuisier' },
};

// Fallback for categories created in the dashboard that the app doesn't know yet.
export const categoryMeta = (key, apiCategory) => {
  const known = META[String(key || '').toUpperCase()];
  if (known) return known;
  const color = apiCategory?.color || '#1a56db';
  return {
    icon: apiCategory?.icon || 'construct',
    lib: 'ionicons',
    color,
    bg: color + '1a',
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
