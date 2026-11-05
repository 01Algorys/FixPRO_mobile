import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  quality: 0.7,
  // HEIC photos are converted to JPEG, which the server accepts
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const openSettings = (what) =>
  Alert.alert('Autorisation requise', `Autorisez l'accès ${what} dans les réglages pour continuer.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Réglages', onPress: () => Linking.openSettings() },
  ]);

const fromCamera = async (cameraType) => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    openSettings('à la caméra');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    ...PICKER_OPTIONS,
    cameraType: cameraType === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
  });
  return result.canceled ? null : result.assets[0];
};

const fromLibrary = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    openSettings('à vos photos');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : result.assets[0];
};

// Asks camera or gallery, then returns the chosen asset, or null if cancelled
export const pickImage = ({ title = 'Ajouter une photo', cameraType } = {}) =>
  new Promise((resolve) => {
    const run = (source) => source().then(resolve).catch((error) => {
      console.error('Image picker failed:', error);
      Alert.alert('Photo indisponible', "Impossible d'accéder à la photo. Réessayez.");
      resolve(null);
    });
    Alert.alert(title, undefined, [
      { text: 'Prendre une photo', onPress: () => run(() => fromCamera(cameraType)) },
      { text: 'Choisir dans la galerie', onPress: () => run(fromLibrary) },
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
