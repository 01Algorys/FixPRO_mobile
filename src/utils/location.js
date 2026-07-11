import * as Location from 'expo-location';

// Asks for foreground location permission if not already granted.
// Returns true if the app can read the device's location.
export const ensureLocationPermission = async () => {
  const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

// Returns { latitude, longitude } for the device's current position,
// or null if permission was denied or the position couldn't be read.
export const getCurrentCoords = async () => {
  try {
    const granted = await ensureLocationPermission();
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.error('getCurrentCoords error:', error);
    return null;
  }
};

// Resolves coordinates to a human-readable city name using the device's
// native geocoder (no API key required). Returns null if unavailable.
export const reverseGeocodeCity = async (latitude, longitude) => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results?.[0];
    if (!place) return null;
    return place.city || place.subregion || place.region || null;
  } catch (error) {
    console.error('reverseGeocodeCity error:', error);
    return null;
  }
};

// Resolves coordinates to a street address / city / postal code using the
// device's native geocoder (no API key required). Returns null if unavailable.
export const reverseGeocodeAddress = async (latitude, longitude) => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results?.[0];
    if (!place) return null;

    const streetParts = [place.streetNumber, place.street].filter(Boolean);
    return {
      address: streetParts.join(' ') || place.name || '',
      city: place.city || place.subregion || place.region || '',
      postalCode: place.postalCode || '',
    };
  } catch (error) {
    console.error('reverseGeocodeAddress error:', error);
    return null;
  }
};
