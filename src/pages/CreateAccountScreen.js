import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useScreenChrome } from '../context/ChromeContext';
import PasswordRequirements from '../components/PasswordRequirements';
import { isPasswordValid } from '../utils/passwordValidation';
import ServicePicker from '../components/auth/ServicePicker';
import FadeIn from '../components/ui/FadeIn';
import {
  AuthHeader, SocialButtons, Divider, PrimaryButton, Field, PhonePrefix, PRIMARY, INK, MUTED,
} from '../components/auth/AuthUI';

export default function CreateAccountScreen({ navigation, route }) {
  useScreenChrome('#ffffff');
  const { signup, loginWithSocial } = useAuth();
  const { role } = route.params || {};
  const isWorker = role === 'WORKER';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [services, setServices] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const clearError = (key) => errors[key] && setErrors((prev) => ({ ...prev, [key]: '' }));

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Indiquez votre nom';
    if (!email.trim()) e.email = 'Indiquez votre email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalide';
    if (!phone.trim()) e.phone = 'Indiquez votre numéro';
    if (!password) e.password = 'Choisissez un mot de passe';
    else if (!isPasswordValid(password)) e.password = 'Le mot de passe ne respecte pas tous les critères';
    if (confirm !== password) e.confirm = 'Les mots de passe ne correspondent pas';
    if (isWorker && services.length === 0) e.services = 'Choisissez au moins un service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const result = await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim(),
        ...(isWorker && { services }),
      });
      if (result.pendingApproval) {
        // Worker account created but awaiting admin approval — go to info screen
        navigation.replace('PendingApproval');
        return;
      }
      if (!result.success) Alert.alert('Inscription impossible', result.error || 'Échec de la création du compte');
      // Clients are signed in; the navigator switches to the app
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider) => {
    setSocialLoading(provider);
    const result = await loginWithSocial(provider, { role });
    setSocialLoading(null);
    if (result.needsWorkerDetails) {
      navigation.navigate('SocialWorkerSetup', { provider, credentials: result.credentials, profile: result.profile });
    } else if (result.pendingApproval) {
      navigation.replace('PendingApproval');
    } else if (result.success === false) {
      Alert.alert('Inscription impossible', result.error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader
            title={isWorker ? 'Devenir technicien' : 'Créer un compte'}
            subtitle={isWorker
              ? 'Inscrivez-vous en 1 minute. Votre profil sera validé par notre équipe.'
              : 'Trouvez un professionnel de confiance près de chez vous.'}
            onBack={() => navigation.goBack()}
          />

          <FadeIn>
            <SocialButtons signup onPress={handleSocial} loading={socialLoading} disabled={loading} />
            <Divider label="ou avec votre email" />
          </FadeIn>

          <FadeIn delay={60}>
            <Field
              label="Nom complet"
              icon="person-outline"
              value={name}
              onChangeText={(v) => { setName(v); clearError('name'); }}
              placeholder="Prénom Nom"
              autoCapitalize="words"
              textContentType="name"
              error={errors.name}
            />
            <Field
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={(v) => { setEmail(v); clearError('email'); }}
              placeholder="email@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              error={errors.email}
            />
            <Field
              label="Téléphone"
              left={<PhonePrefix />}
              value={phone}
              onChangeText={(v) => { setPhone(v); clearError('phone'); }}
              placeholder="12 345 678"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              error={errors.phone}
            />
            <Field
              label="Mot de passe"
              icon="lock-closed-outline"
              value={password}
              onChangeText={(v) => { setPassword(v); clearError('password'); }}
              onFocus={() => setPasswordFocused(true)}
              placeholder="Au moins 8 caractères"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              error={errors.password}
              right={(
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            />
            {(passwordFocused || !!password) && (
              <View style={styles.requirements}>
                <PasswordRequirements password={password} />
              </View>
            )}
            <Field
              label="Confirmer le mot de passe"
              icon="lock-closed-outline"
              value={confirm}
              onChangeText={(v) => { setConfirm(v); clearError('confirm'); }}
              placeholder="Retapez le mot de passe"
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              error={errors.confirm}
            />

            {isWorker && (
              <View style={styles.servicesBlock}>
                <Text style={styles.servicesTitle}>Vos services</Text>
                <Text style={styles.servicesHint}>Sélectionnez tout ce que vous proposez.</Text>
                <ServicePicker
                  selected={services}
                  onChange={(next) => { setServices(next); clearError('services'); }}
                  error={errors.services}
                />
              </View>
            )}

            <PrimaryButton
              label={isWorker ? 'Envoyer ma candidature' : 'Créer mon compte'}
              onPress={handleCreate}
              loading={loading}
              disabled={!!socialLoading}
            />
            <Text style={styles.legal}>
              En continuant, vous acceptez les conditions d'utilisation de FixPro.
            </Text>
          </FadeIn>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà inscrit ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 22, paddingBottom: 30 },
  requirements: { marginTop: -6, marginBottom: 12, paddingHorizontal: 4 },
  servicesBlock: { marginTop: 6, marginBottom: 18 },
  servicesTitle: { fontSize: 17, fontWeight: '800', color: INK },
  servicesHint: { fontSize: 13.5, color: MUTED, marginTop: 2, marginBottom: 12 },
  legal: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontSize: 14.5, color: MUTED },
  footerLink: { fontSize: 14.5, color: PRIMARY, fontWeight: '700' },
});
