// Visual identity for each service category (icon, colors, profession title).
// Categories themselves come from the API (/categories, managed in the admin
// dashboard); this only decides how a known key looks in the app.
const META = {
  PLUMBING: { icon: 'water', lib: 'ionicons', color: '#1a73e8', bg: '#e8f1fe', profession: 'Plombier' },
  ELECTRICAL: { icon: 'flash', lib: 'ionicons', color: '#f5b400', bg: '#fff6dc', profession: 'Électricien' },
  HVAC: { icon: 'snowflake', lib: 'mci', color: '#1a73e8', bg: '#e6f4fd', profession: 'Frigoriste' },
  LOCKSMITH: { icon: 'key-variant', lib: 'mci', color: '#7c3aed', bg: '#f1eafe', profession: 'Serrurier' },
  PAINTING: { icon: 'format-paint', lib: 'mci', color: '#ec4868', bg: '#fdebef', profession: 'Peintre' },
  HANDYMAN: { icon: 'tools', lib: 'mci', color: '#f97316', bg: '#fff0e3', profession: 'Bricoleur' },
  APPLIANCE: { icon: 'washing-machine', lib: 'mci', color: '#2563eb', bg: '#e8effd', profession: 'Réparateur électroménager' },
  CLEANING: { icon: 'broom', lib: 'mci', color: '#10b981', bg: '#e3f8f0', profession: 'Agent de nettoyage' },
  GARDENING: { icon: 'leaf', lib: 'mci', color: '#16a34a', bg: '#e5f6ea', profession: 'Jardinier' },
  CARPENTRY: { icon: 'hammer', lib: 'mci', color: '#a16207', bg: '#f8efe1', profession: 'Menuisier' },
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
    profession: apiCategory?.name || 'Technicien',
  };
};

export const professionTitle = (key) => {
  const meta = META[String(key || '').toUpperCase()];
  return meta ? `${meta.profession} professionnel` : 'Technicien professionnel';
};

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
