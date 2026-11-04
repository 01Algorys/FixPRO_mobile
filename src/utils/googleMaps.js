// Google Places (New) address search, limited to Tunisia. The key comes from
// .env.local locally and from an EAS environment variable on cloud builds.
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const PLACES_URL = 'https://places.googleapis.com/v1';

export const hasGoogleMaps = !!API_KEY;

// Groups the searches of one address lookup into a single billed session
export const newPlacesSession = () => Math.random().toString(36).slice(2);

// Returns [{ id, text }] suggestions for what the user typed
export const searchPlaces = async (input, sessionToken) => {
  if (!API_KEY) return [];
  const response = await fetch(`${PLACES_URL}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
    body: JSON.stringify({ input, sessionToken, includedRegionCodes: ['tn'], languageCode: 'fr' }),
  });
  if (!response.ok) return [];
  const { suggestions = [] } = await response.json();
  return suggestions
    .filter((s) => s.placePrediction)
    .map((s) => ({ id: s.placePrediction.placeId, text: s.placePrediction.text?.text || '' }));
};

// Returns { latitude, longitude, address } for a suggestion, or null
export const getPlaceLocation = async (placeId, sessionToken) => {
  const response = await fetch(`${PLACES_URL}/places/${placeId}?sessionToken=${sessionToken}&languageCode=fr`, {
    headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'location,formattedAddress' },
  });
  if (!response.ok) return null;
  const place = await response.json();
  if (!place.location) return null;
  return { ...place.location, address: place.formattedAddress || '' };
};
