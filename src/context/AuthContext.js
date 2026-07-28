import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import socketService from '../services/socketService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Map backend error codes / messages to user-facing French strings
const mapLoginError = (rawMessage) => {
  if (!rawMessage) return 'Identifiants incorrects';
  if (rawMessage.includes('ACCOUNT_PENDING_APPROVAL')) {
    return "Votre compte est en cours de validation par nos administrateurs. Veuillez patienter jusqu'à l'approbation de votre compte.";
  }
  if (rawMessage.includes('ACCOUNT_REJECTED')) {
    return 'Votre demande de compte a été refusée. Veuillez contacter notre support pour plus d\'informations.';
  }
  if (rawMessage.toLowerCase().includes('invalid credentials')) {
    return 'Identifiants incorrects. Vérifiez votre email/téléphone et mot de passe.';
  }
  return rawMessage;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
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

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      const { token, user: userData } = response.data || response;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.removeItem('isGuest');

      setUser(userData);
      setIsAuthenticated(true);
      setIsGuest(false);
      socketService.connect();

      return { success: true, user: userData, role: userData.role };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: mapLoginError(error.message) };
    }
  };

  const logout = async () => {
    try {
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

      // Workers NEVER get auto-logged in — they must wait for admin approval.
      // We check both the backend flag and the role so this works even if the
      // backend hasn't been redeployed yet (old backend returns a token for workers).
      if (response.pendingApproval || userData.role === 'WORKER') {
        return { success: true, pendingApproval: true };
      }

      // For regular users, auto-login after successful registration
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
