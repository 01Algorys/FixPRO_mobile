import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import CountryCodePicker from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, fullPhone } from '../utils/countries';
import {
  AuthShell, AuthTitle, SocialButtons, Divider, PrimaryButton, Field, PRIMARY, INK, MUTED,
} from '../components/auth/AuthUI';

export default function LoginScreen({ navigation }) {
  const { login, loginWithSocial } = useAuth();
  const [tab, setTab] = useState('phone');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const handleLogin = async () => {
    const identifier = tab === 'phone' ? fullPhone(country, phone) : email.trim();
    if (!identifier || !password) {
      Alert.alert('Champs manquants', 'Renseignez votre identifiant et votre mot de passe.');
      return;
    }
    try {
      setLoading(true);
      // Send the correct field name so the backend can identify the login method
      const credentials = tab === 'phone'
        ? { phone: identifier, password }
        : { email: identifier, password };
      const result = await login(credentials);
      if (!result.success) Alert.alert('Connexion impossible', result.error || 'Identifiants incorrects');
      // On success, navigation is driven by isAuthenticated state in AppNavigator
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider) => {
    setSocialLoading(provider);
    const result = await loginWithSocial(provider);
    setSocialLoading(null);
    const social = { provider, credentials: result.credentials, profile: result.profile };
    if (result.needsRole) {
      // New Google / Apple account: ask whether they're a client or a technician
      navigation.navigate('RoleSelection', { social });
    } else if (result.needsWorkerDetails) {
      navigation.navigate('SocialWorkerSetup', social);
    } else if (result.pendingApproval) {
      navigation.navigate('PendingApproval');
    } else if (result.success === false) {
      Alert.alert('Connexion impossible', result.error);
    }
  };

  return (
    <AuthShell onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}>
      <AuthTitle title="Bon retour 👋" subtitle="Connectez-vous pour réserver ou gérer vos interventions." />

      <FadeIn delay={60}>
        <View style={styles.segment}>
          {[['phone', 'Téléphone', 'call-outline'], ['email', 'Email', 'mail-outline']].map(([key, label, icon]) => {
            const active = tab === key;
            return (
              <PressableScale key={key} style={[styles.segmentItem, active && styles.segmentActive]} onPress={() => setTab(key)}>
                <Ionicons name={icon} size={16} color={active ? PRIMARY : MUTED} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
              </PressableScale>
            );
          })}
        </View>

        {tab === 'phone' ? (
          <Field
            left={<CountryCodePicker country={country} onChange={setCountry} />}
            value={phone}
            onChangeText={setPhone}
            placeholder="12 345 678"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
        ) : (
          <Field
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        )}
        <Field
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Mot de passe"
          secureTextEntry={!showPassword}
          textContentType="password"
          onSubmitEditing={handleLogin}
          returnKeyType="go"
          right={(
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={styles.forgot}
          onPress={() => Alert.alert(
            'Mot de passe oublié',
            'Contactez le support à fixproo.support@gmail.com pour réinitialiser votre mot de passe.',
          )}
        >
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <PrimaryButton label="Se connecter" onPress={handleLogin} loading={loading} disabled={!!socialLoading} />
      </FadeIn>

      <Divider label="ou continuer avec" />
      <SocialButtons onPress={handleSocial} loading={socialLoading} disabled={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte ?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
          <Text style={styles.footerLink}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 16 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 11 },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  segmentText: { fontSize: 14.5, fontWeight: '600', color: MUTED },
  segmentTextActive: { color: INK },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20, paddingVertical: 4 },
  forgotText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  footerText: { fontSize: 14.5, color: INK },
  footerLink: { fontSize: 14.5, color: PRIMARY, fontWeight: '700' },
});
