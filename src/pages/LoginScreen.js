import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const BLUE = '#1a56db';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const identifier = tab === 'phone' ? phone.trim() : email.trim();
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    try {
      setLoading(true);
      const result = await login({ [tab]: identifier, password });
      // Navigation is handled by AuthContext/AppNavigator based on auth state
    } catch (err) {
      Alert.alert('Erreur', err?.message ?? 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1a56db', '#1565c0']} style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Connexion</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* White card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenue chez FixPro !</Text>
            <Text style={styles.cardSub}>Connectez-vous pour continuer</Text>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, tab === 'phone' && styles.tabActive]}
                onPress={() => setTab('phone')}
              >
                <Text style={[styles.tabText, tab === 'phone' && styles.tabTextActive]}>
                  Téléphone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'email' && styles.tabActive]}
                onPress={() => setTab('email')}
              >
                <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone / Email input */}
            {tab === 'phone' ? (
              <View style={styles.inputBox}>
                <Text style={styles.flag}>🇹🇳</Text>
                <Text style={styles.dialCode}>+216</Text>
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.inputText}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="12 345 678"
                  placeholderTextColor="#b0b8c9"
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color="#b0b8c9" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputText}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@exemple.com"
                  placeholderTextColor="#b0b8c9"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Password input */}
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor="#b0b8c9"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22} color="#b0b8c9"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => Alert.alert('Info', 'Fonctionnalité de récupération de mot de passe à venir')}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Se connecter</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>ou continuer avec</Text>
              <View style={styles.orLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Vous n'avez pas de compte ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
                <Text style={styles.registerLink}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 20,
  },
  topTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  tab: { flex: 1, paddingBottom: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: BLUE },
  tabText: { fontSize: 15, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: BLUE },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: '#f9fafb',
  },
  flag: { fontSize: 22, marginRight: 6 },
  dialCode: { fontSize: 15, fontWeight: '700', color: '#374151', marginRight: 8 },
  inputDivider: { width: 1, height: 22, backgroundColor: '#d1d5db', marginRight: 10 },
  inputText: { flex: 1, fontSize: 15, color: '#111827' },

  forgotRow: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 14, color: BLUE, fontWeight: '600' },

  loginBtn: {
    backgroundColor: BLUE,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { fontSize: 13, color: '#9ca3af' },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  googleG: { fontSize: 18, fontWeight: '900', color: '#ea4335' },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#111827' },

  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 14, color: '#6b7280' },
  registerLink: { fontSize: 14, fontWeight: '700', color: BLUE },
});
