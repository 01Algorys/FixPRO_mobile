import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { t } from '../i18n';

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  quality: 0.7,
  // HEIC photos are converted to JPEG, which the server accepts
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const openSettings = (message) =>
  Alert.alert(t('picker.permissionTitle'), message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.settings'), onPress: () => Linking.openSettings() },
  ]);

const fromCamera = async (cameraType) => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    openSettings(t('picker.permissionCamera'));
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
    openSettings(t('picker.permissionPhotos'));
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : result.assets[0];
};

// Asks camera or gallery, then returns the chosen asset, or null if cancelled
export const pickImage = ({ title = t('picker.addPhoto'), cameraType } = {}) =>
  new Promise((resolve) => {
    const run = (source) => source().then(resolve).catch((error) => {
      console.error('Image picker failed:', error);
      Alert.alert(t('picker.photoUnavailable'), t('picker.photoAccessFailed'));
      resolve(null);
    });
    Alert.alert(title, undefined, [
      { text: t('picker.takePhoto'), onPress: () => run(() => fromCamera(cameraType)) },
      { text: t('picker.chooseGallery'), onPress: () => run(fromLibrary) },
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
