import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
 
// ─────────────────────────────────────────────────────────────
// NOTIFICATION HANDLER
// SDK 53: shouldShowBanner + shouldShowList replace shouldShowAlert
// shouldSetBadge: false — badge requires remote push entitlement
// not available in Expo Go
// ─────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
 
// ─────────────────────────────────────────────────────────────
// ANDROID CHANNEL SETUP
// Must be called before requestPermissionsAsync on Android 13+
// ─────────────────────────────────────────────────────────────
const setupAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6366f1',
    enableVibrate: true,
    showBadge: false,
    sound: true,
  });
};
 
// ─────────────────────────────────────────────────────────────
// REQUEST PERMISSIONS
// ─────────────────────────────────────────────────────────────
export const requestNotificationPermissions = async () => {
  try {
    await setupAndroidChannel();
 
    if (!Device.isDevice) {
      console.warn('[Notifications] Must use a physical device');
      return false;
    }
 
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
 
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowSound: true,
          allowBadge: false,
        },
      });
      finalStatus = status;
    }
 
    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission denied by user');
      return false;
    }
 
    console.log('[Notifications] Permission granted ✓');
    return true;
  } catch (error) {
    console.error('[Notifications] requestNotificationPermissions error:', error);
    return false;
  }
};
 
// ─────────────────────────────────────────────────────────────
// SHOW LOCAL NOTIFICATION IMMEDIATELY
// Local notifications work fine in Expo Go
// ─────────────────────────────────────────────────────────────
export const showLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[Notifications] showLocalNotification error:', error);
  }
};
 
// ─────────────────────────────────────────────────────────────
// LISTENER: notification received in foreground
// ─────────────────────────────────────────────────────────────
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener((notification) => {
    callback(notification);
  });
};
 
// ─────────────────────────────────────────────────────────────
// LISTENER: user taps on a notification
// ─────────────────────────────────────────────────────────────
export const addNotificationTapListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    callback(data);
  });
};
 
// ─────────────────────────────────────────────────────────────
// REMOVE SUBSCRIPTION
// ─────────────────────────────────────────────────────────────
export const removeNotificationSubscription = (subscription) => {
  if (subscription && typeof subscription.remove === 'function') {
    subscription.remove();
  }
};
 
// ─────────────────────────────────────────────────────────────
// CLEAR ALL DELIVERED NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export const clearAllNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] clearAllNotifications error:', error);
  }
};
