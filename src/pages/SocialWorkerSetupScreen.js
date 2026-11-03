import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Alert, Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useScreenChrome } from '../context/ChromeContext';
import ServicePicker from '../components/auth/ServicePicker';
import FadeIn from '../components/ui/FadeIn';
import { AuthHeader, PrimaryButton, Field, PhonePrefix, INK, MUTED } from '../components/auth/AuthUI';

// Last step of a technician's Google / Apple sign-up: the provider gives us
// their name and email; we still need a phone number and the services they offer before the
// account is created (it then waits for admin approval).
export default function SocialWorkerSetupScreen({ navigation, route }) {
  useScreenChrome('#ffffff');
  const { loginWithSocial } = useAuth();
  const { provider, credentials, profile } = route.params || {};
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {};
    if (!phone.trim()) e.phone = 'Indiquez votre numéro';
    if (services.length === 0) e.services = 'Choisissez au moins un service';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    const result = await loginWithSocial(provider, { credentials, role: 'WORKER', phone: phone.trim(), services });
    setLoading(false);

    if (result.pendingApproval) {
      navigation.reset({ index: 0, routes: [{ name: 'PendingApproval' }] });
    } else if (result.success === false) {
      Alert.alert('Inscription impossible', result.error);
    }
    // An existing account (same email) is simply signed in
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader
            title="Votre expertise"
            subtitle="Dernière étape : vos clients doivent pouvoir vous joindre et savoir ce que vous proposez."
            onBack={() => navigation.goBack()}
          />

          {!!profile && (
            <FadeIn style={styles.account}>
              {profile.picture ? (
                <Image source={{ uri: profile.picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{(profile.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName} numberOfLines={1}>{profile.name}</Text>
                <Text style={styles.accountEmail} numberOfLines={1}>{profile.email}</Text>
              </View>
            </FadeIn>
          )}

          <FadeIn delay={60}>
            <Field
              label="Téléphone"
              left={<PhonePrefix />}
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors((p) => ({ ...p, phone: '' })); }}
              placeholder="12 345 678"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              error={errors.phone}
            />

            <Text style={styles.servicesTitle}>Vos services</Text>
            <Text style={styles.servicesHint}>Sélectionnez tout ce que vous proposez.</Text>
            <ServicePicker
              selected={services}
              onChange={(next) => { setServices(next); setErrors((p) => ({ ...p, services: '' })); }}
              error={errors.services}
            />

            <View style={{ height: 10 }} />
            <PrimaryButton label="Envoyer ma candidature" onPress={submit} loading={loading} />
            <Text style={styles.note}>Notre équipe vérifie chaque technicien avant activation du compte.</Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 22, paddingBottom: 30 },
  account: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 20,
    backgroundColor: '#f6f9ff', borderRadius: 18, borderWidth: 1, borderColor: '#e3ecff',
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e3edff' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1d5ff0' },
  accountName: { fontSize: 15.5, fontWeight: '700', color: INK },
  accountEmail: { fontSize: 13, color: MUTED, marginTop: 1 },
  servicesTitle: { fontSize: 17, fontWeight: '800', color: INK, marginTop: 6 },
  servicesHint: { fontSize: 13.5, color: MUTED, marginTop: 2, marginBottom: 12 },
  note: { fontSize: 12.5, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
});
