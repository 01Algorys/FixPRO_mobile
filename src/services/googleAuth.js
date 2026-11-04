import { Platform } from 'react-native';

// iOS client from GCP. Android needs no id here: Google matches the app by its
// package name and signing-key SHA-1 registered on the Android OAuth client.
const IOS_CLIENT_ID = '845008512991-p4do64u09t79gsslc1mefcvlh80u464v.apps.googleusercontent.com';

// The native module only exists in builds made after it was added; older
// installs (or Expo Go) get a clear message instead of a crash.
let GoogleSignin = null;
let isCancelled = () => false;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  isCancelled = (error) => error?.code === mod.statusCodes.SIGN_IN_CANCELLED;
  GoogleSignin.configure({ iosClientId: IOS_CLIENT_ID, scopes: ['email', 'profile'] });
} catch (error) {
  GoogleSignin = null;
}

export class GoogleSignInCancelled extends Error {}

// Opens Google's account picker and returns an access token the backend can
// check with Google. Throws GoogleSignInCancelled if the user backs out.
export const getGoogleAccessToken = async () => {
  if (!GoogleSignin) {
    throw new Error("La connexion Google nécessite la dernière version de l'application.");
  }
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    // Always show the account picker rather than silently reusing the last account
    await GoogleSignin.signOut().catch(() => {});
    const result = await GoogleSignin.signIn();
    if (result?.type === 'cancelled') throw new GoogleSignInCancelled();
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  } catch (error) {
    if (error instanceof GoogleSignInCancelled || isCancelled(error)) throw new GoogleSignInCancelled();
    // Keep Google's code in the logs: on Android "10" (DEVELOPER_ERROR) means the
    // build's signing-key SHA-1 isn't registered on an Android OAuth client.
    console.warn('Google sign-in error', error?.code, error?.message);
    throw new Error('Connexion Google impossible. Réessayez.');
  }
};

export const signOutGoogle = () => GoogleSignin?.signOut().catch(() => {});
