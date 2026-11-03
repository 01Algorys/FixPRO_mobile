import { Platform } from 'react-native';

// The native module only exists in iOS builds made after it was added; older
// installs (or Expo Go / Android) simply don't show the Apple button.
let AppleAuthentication = null;
try {
  if (Platform.OS === 'ios') AppleAuthentication = require('expo-apple-authentication');
} catch (error) {
  AppleAuthentication = null;
}

export class AppleSignInCancelled extends Error {}

// True when "Continuer avec Apple" can be offered on this device
export const isAppleSignInAvailable = async () => {
  try {
    return !!AppleAuthentication && await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    return false;
  }
};

// Opens Apple's sign-in sheet and returns { identityToken, fullName } for the
// backend, which checks the token against Apple's keys. Apple only shares the
// name on the very first authorization, so it travels with the token.
// Throws AppleSignInCancelled if the user backs out.
export const getAppleCredentials = async () => {
  if (!AppleAuthentication) {
    throw new Error("La connexion Apple nécessite la dernière version de l'application.");
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const { givenName, familyName } = credential.fullName || {};
    const fullName = [givenName, familyName].filter(Boolean).join(' ') || undefined;
    return { identityToken: credential.identityToken, fullName };
  } catch (error) {
    if (error?.code === 'ERR_REQUEST_CANCELED') throw new AppleSignInCancelled();
    console.warn('Apple sign-in error', error?.code, error?.message);
    throw new Error('Connexion Apple impossible. Réessayez.');
  }
};
