import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { getGoogleAccessToken, signOutGoogle, GoogleSignInCancelled } from '../services/googleAuth';
import { getAppleCredentials, AppleSignInCancelled } from '../services/appleAuth';
import { t } from '../i18n';

const AuthContext = createContext();

// "Continuer avec Google / Apple": how each provider gets credentials from the
// device and which endpoint checks them.
const SOCIAL_PROVIDERS = {
  google: {
    label: 'Google',
    getCredentials: async () => ({ accessToken: await getGoogleAccessToken() }),
    request: (body) => apiService.googleAuth(body),
    isCancelled: (error) => error instanceof GoogleSignInCancelled,
  },
  apple: {
    label: 'Apple',
    getCredentials: getAppleCredentials,
    request: (body) => apiService.appleAuth(body),
    isCancelled: (error) => error instanceof AppleSignInCancelled,
  },
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
    // The API reports a rejected token; drop the dead session (back to welcome)
    apiService.onUnauthorized = () => logout();
    return () => { apiService.onUnauthorized = null; };
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        setIsGuest(false);
        socketService.connect();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        const guestFlag = await AsyncStorage.getItem('isGuest');
        setIsGuest(guestFlag === 'true');
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    try {
      await AsyncStorage.setItem('isGuest', 'true');
    } catch (error) {
      console.error('Failed to persist guest mode:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(true);
  };

  const startSession = async (token, userData) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await AsyncStorage.removeItem('isGuest');

    setUser(userData);
    setIsAuthenticated(true);
    setIsGuest(false);
    socketService.connect();
  };

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      const { token, user: userData } = response.data || response;
      await startSession(token, userData);
      return { success: true, user: userData, role: userData.role };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message || t('auth.wrongCredentials') };
    }
  };

  // "Continuer avec Google / Apple" (provider = 'google' | 'apple'). Pass the
  // returned credentials back on the follow-up calls (role choice, technician
  // details) so the provider's sheet isn't shown again.
  // Returns one of: { success } (signed in), { needsRole, profile, credentials },
  // { needsWorkerDetails, profile, credentials }, { pendingApproval },
  // { cancelled } or { success: false, error }.
  const loginWithSocial = async (provider, { credentials, role, phone, services } = {}) => {
    const social = SOCIAL_PROVIDERS[provider];
    let creds = credentials;
    try {
      if (!creds) creds = await social.getCredentials();
      let response;
      try {
        response = await social.request({ ...creds, role, phone, services });
      } catch (error) {
        // Apple identity tokens last 10 minutes; one may expire while the user
        // fills in the technician form. Ask Apple again, keeping the name it
        // only shares the first time.
        if (error.code !== 'APPLE_TOKEN_INVALID' || !credentials) throw error;
        creds = { ...(await social.getCredentials()), fullName: creds.fullName };
        response = await social.request({ ...creds, role, phone, services });
      }
      const data = response.data || {};

      if (data.needsRole) return { needsRole: true, profile: data.profile, credentials: creds };
      if (data.needsWorkerDetails) return { needsWorkerDetails: true, profile: data.profile, credentials: creds };

      await startSession(data.token, data.user);
      return { success: true, user: data.user, role: data.user.role };
    } catch (error) {
      if (social.isCancelled(error)) return { cancelled: true };
      if (error.code === 'ACCOUNT_PENDING_APPROVAL') return { pendingApproval: true };
      console.error(`${social.label} sign-in failed:`, error);
      // A server without the endpoint answers as if login were required
      if (/no token provided|not found/i.test(error.serverMessage || '')) {
        return { success: false, error: t('auth.socialUnavailable', { provider: social.label }) };
      }
      return { success: false, error: error.message || t('auth.wrongCredentials') };
    }
  };

  const logout = async () => {
    try {
      signOutGoogle();
      socketService.disconnect();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isGuest');
      setUser(null);
      setIsAuthenticated(false);
      setIsGuest(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const signup = async (userData) => {
    try {
      const response = await apiService.register(userData);

      // Technicians wait for an admin to approve their account
      if (response.pendingApproval) return { success: true, pendingApproval: true };

      // Auto-login after successful registration
      const loginResult = await login({
        email: userData.email,
        password: userData.password,
      });

      return loginResult;
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiService.updateUserProfile(profileData);
      const updatedUser = response.data || response;
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: error.message };
    }
  };

  const updateAvatar = async (avatarBase64) => {
    try {
      const updatedUser = { ...user, avatar: avatarBase64 };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Avatar update failed:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isGuest,
        loading,
        login,
        loginWithSocial,
        logout,
        signup,
        continueAsGuest,
        updateProfile,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
