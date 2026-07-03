import { createNavigationContainerRef } from '@react-navigation/native';

// Shared ref so screens/contexts without direct access to a `navigation`
// prop (e.g. NotificationContext) can still trigger navigation.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
