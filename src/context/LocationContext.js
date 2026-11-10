import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import apiService from '../services/api';
import { reverseGeocodeCity } from '../utils/location';
import { t } from '../i18n';

// The device's position for the whole app. Asked once when the app starts,
// read again each time it comes back from the background. A technician's
// position is saved to their profile, so clients nearby see them first.
//
// status: 'unknown' (not asked yet) | 'locating' | 'granted' | 'denied'
//         | 'unavailable' (allowed, but no position, e.g. location services off)

const LocationContext = createContext({
  coords: null, city: null, status: 'unknown', retry: () => {}, refresh: () => {},
});

const POSITION_TIMEOUT_MS = 15000;
// A technician who hasn't moved more than this keeps the saved position
const SAVE_MIN_DISTANCE_M = 30;

const metersBetween = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
};

// The current position, or the last known one when it takes too long
const readPosition = async () => {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), POSITION_TIMEOUT_MS));
  const current = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
  const position = (await Promise.race([current, timeout]))
    || (await Location.getLastKnownPositionAsync().catch(() => null));
  return position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : null;
};

export const LocationProvider = ({ children }) => {
  const { user } = useAuth();
  const [coords, setCoords] = useState(null);
  const [city, setCity] = useState(null);
  const [status, setStatus] = useState('unknown');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const busy = useRef(false);
  const userRef = useRef(user);
  const coordsRef = useRef(null);
  // Last position saved to the technician's profile: { userId, latitude, longitude }
  const saved = useRef(null);

  userRef.current = user;

  const saveForTechnician = async (position) => {
    const current = userRef.current;
    if (!position || current?.role !== 'WORKER') return;
    const last = saved.current;
    if (last && last.userId === current.id && metersBetween(last, position) < SAVE_MIN_DISTANCE_M) return;
    try {
      await apiService.updateWorkerProfile({ latitude: position.latitude, longitude: position.longitude });
      saved.current = { userId: current.id, ...position };
    } catch (error) {
      console.warn('Failed to save the technician position:', error.message);
    }
  };

  // `ask` shows the system prompt when it can; without it, only reads the
  // permission (e.g. coming back from the Settings app)
  const refresh = useCallback(async ({ ask = false } = {}) => {
    if (busy.current) return;
    busy.current = true;
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted' && ask && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      setCanAskAgain(permission.canAskAgain !== false);
      if (permission.status !== 'granted') {
        setStatus('denied');
        return;
      }
      if (!coordsRef.current) setStatus('locating');
      const position = await readPosition();
      if (!position) {
        if (!coordsRef.current) setStatus('unavailable');
        return;
      }
      coordsRef.current = position;
      setCoords(position);
      setStatus('granted');
      reverseGeocodeCity(position.latitude, position.longitude).then((name) => name && setCity(name)).catch(() => {});
      await saveForTechnician(position);
    } catch (error) {
      console.warn('Location refresh failed:', error.message);
      if (!coordsRef.current) setStatus('unavailable');
    } finally {
      busy.current = false;
    }
  }, []);

  // Asked as the app starts
  useEffect(() => {
    refresh({ ask: true });
  }, [refresh]);

  // Signed in as a technician (or switched account): save the position
  useEffect(() => {
    if (user?.role !== 'WORKER') return;
    if (coordsRef.current) saveForTechnician(coordsRef.current);
    else refresh();
  }, [user?.id, user?.role]);

  // Back from the background: read the position again. The permission prompt
  // itself only makes the app inactive, so it doesn't loop.
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous === 'background' && next === 'active') refresh();
      previous = next;
    });
    return () => subscription.remove();
  }, [refresh]);

  // The "turn on location" action: the system prompt when it can still show,
  // else the app's page in the Settings app (read again on return)
  const retry = useCallback(() => {
    if (status !== 'denied' || canAskAgain) {
      refresh({ ask: true });
      return;
    }
    Alert.alert(t('geo.deniedTitle'), t('geo.deniedHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('geo.openSettings'), onPress: () => Linking.openSettings().catch(() => {}) },
    ]);
  }, [status, canAskAgain, refresh]);

  return (
    <LocationContext.Provider value={{ coords, city, status, retry, refresh }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
