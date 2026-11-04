// The Google Maps key stays out of this public repo: it comes from .env.local locally
// and from an EAS environment variable on cloud builds.
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  ios: { ...config.ios, config: { ...config.ios?.config, googleMapsApiKey } },
  android: {
    ...config.android,
    config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
  },
});
