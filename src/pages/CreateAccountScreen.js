import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PasswordRequirements from '../components/PasswordRequirements';
import { isPasswordValid } from '../utils/passwordValidation';
import ServicePicker from '../components/auth/ServicePicker';
import FadeIn from '../components/ui/FadeIn';
import CountryCodePicker from '../components/CountryCodePicker';
import { DEFAULT_COUNTRY, fullPhone } from '../utils/countries';
import {
  AuthShell, AuthTitle, RoleSwitch, Stepper, TermsCheckbox, SocialButtons, Divider, PrimaryButton,
  Field, PRIMARY, INK,
} from '../components/auth/AuthUI';

const WORKER_STEPS = ['Informations', 'Services', 'Finalisation'];

// One screen for clients and technicians (route.params.role picks the first
// tab). Technicians then choose their services and review their application.
export default function CreateAccountScreen({ navigation, route }) {
  const { signup, loginWithSocial } = useAuth();
  const [role, setRole] = useState(route.params?.role || 'USER');
  const isWorker = role === 'WORKER';

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [services, setServices] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const clearError = (key) => errors[key] && setErrors((prev) => ({ ...prev, [key]: '' }));

  const validateInfo = () => {
    const e = {};
    if (!name.trim()) e.name = 'Indiquez votre nom';
    if (!email.trim()) e.email = 'Indiquez votre email';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalide';
    if (!phone.trim()) e.phone = 'Indiquez votre numéro';
    if (!password) e.password = 'Choisissez un mot de passe';
    else if (!isPasswordValid(password)) e.password = 'Le mot de passe ne respecte pas tous les critères';
    if (confirm !== password) e.confirm = 'Les mots de passe ne correspondent pas';
    if (!accepted) e.accepted = 'Acceptez les conditions pour continuer';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const result = await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: fullPhone(country, phone),
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

  const submitInfo = () => {
    if (!validateInfo()) return;
    if (isWorker) setStep(2);
    else handleCreate();
  };

  const submitServices = () => {
    if (services.length === 0) {
      setErrors((prev) => ({ ...prev, services: 'Choisissez au moins un service' }));
      return;
    }
    setStep(3);
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

  const goBack = () => (step > 1 ? setStep(step - 1) : navigation.goBack());

  return (
    <AuthShell onBack={goBack} scrollKey={step}>
      {step === 1 && (
        <FadeIn>
          <AuthTitle
            icon={isWorker ? 'hard-hat' : undefined}
            title={isWorker ? 'Créer un compte Technicien' : 'Créer un compte'}
            subtitle={isWorker
              ? 'Rejoignez FixPro et proposez vos services à des clients près de chez vous.'
              : 'Rejoignez FixPro et accédez à tous les services.'}
          />
          <RoleSwitch role={role} onChange={setRole} />

          <Field
            icon="person-outline"
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
            placeholder="Nom complet"
            autoCapitalize="words"
            textContentType="name"
            error={errors.name}
          />
          <Field
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            placeholder="Adresse e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            error={errors.email}
          />
          <Field
            left={<CountryCodePicker country={country} onChange={setCountry} />}
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            placeholder="Numéro de téléphone"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            error={errors.phone}
          />
          <Field
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            onFocus={() => setPasswordFocused(true)}
            placeholder="Mot de passe"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            error={errors.password}
            right={<PasswordEye shown={showPassword} onPress={() => setShowPassword(!showPassword)} />}
          />
          {(passwordFocused || !!password) && (
            <View style={styles.requirements}>
              <PasswordRequirements password={password} />
            </View>
          )}
          <Field
            icon="lock-closed-outline"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); clearError('confirm'); }}
            placeholder="Confirmer le mot de passe"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            error={errors.confirm}
            right={<PasswordEye shown={showPassword} onPress={() => setShowPassword(!showPassword)} />}
          />

          <TermsCheckbox
            checked={accepted}
            onChange={(v) => { setAccepted(v); clearError('accepted'); }}
            error={errors.accepted}
          />

          <PrimaryButton
            label={isWorker ? 'Créer mon compte Technicien' : 'Créer un compte'}
            onPress={submitInfo}
            loading={loading}
            disabled={!!socialLoading}
          />

          <Divider label="ou s'inscrire avec" />
          <SocialButtons onPress={handleSocial} loading={socialLoading} disabled={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>
      )}

      {step === 2 && (
        <FadeIn>
          <Stepper steps={WORKER_STEPS} current={2} />
          <AuthTitle title="Sélectionnez vos services" subtitle="Vous pouvez choisir plusieurs services." />
          <ServicePicker
            selected={services}
            onChange={(next) => { setServices(next); clearError('services'); }}
            error={errors.services}
          />
          <View style={styles.stepAction}>
            <PrimaryButton label="Continuer" icon="arrow-forward" onPress={submitServices} />
          </View>
        </FadeIn>
      )}

      {step === 3 && (
        <FadeIn>
          <Stepper steps={WORKER_STEPS} current={3} />
          <AuthTitle title="Vérifiez votre candidature" subtitle="Notre équipe valide chaque technicien avant l'activation du compte." />
          <View style={styles.summary}>
            <SummaryRow icon="person-outline" text={name.trim()} />
            <SummaryRow icon="mail-outline" text={email.trim().toLowerCase()} />
            <SummaryRow icon="call-outline" text={fullPhone(country, phone)} />
            <SummaryRow icon="construct-outline" text={`${services.length} service${services.length > 1 ? 's' : ''} sélectionné${services.length > 1 ? 's' : ''}`} />
          </View>
          <View style={styles.stepAction}>
            <PrimaryButton label="Envoyer ma candidature" onPress={handleCreate} loading={loading} />
          </View>
        </FadeIn>
      )}
    </AuthShell>
  );
}

const PasswordEye = ({ shown, onPress }) => (
  <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
    <Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={21} color="#475569" />
  </TouchableOpacity>
);

const SummaryRow = ({ icon, text }) => (
  <View style={styles.summaryRow}>
    <Ionicons name={icon} size={19} color={PRIMARY} />
    <Text style={styles.summaryText} numberOfLines={1}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  requirements: { marginTop: -4, marginBottom: 10, paddingHorizontal: 4 },
  stepAction: { marginTop: 22 },
  summary: { gap: 14, padding: 16, backgroundColor: '#f6f9ff', borderRadius: 18, borderWidth: 1, borderColor: '#e3ecff' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1, fontSize: 15, fontWeight: '600', color: INK },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  footerText: { fontSize: 14.5, color: INK },
  footerLink: { fontSize: 14.5, color: PRIMARY, fontWeight: '700' },
});
