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
import { t } from '../i18n';
import { ltr } from '../i18n/format';

const WORKER_STEPS = [t('auth.stepInfo'), t('auth.stepServices'), t('auth.stepFinish')];

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
    if (!name.trim()) e.name = t('auth.enterName');
    if (!email.trim()) e.email = t('auth.enterEmail');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('auth.invalidEmail');
    if (!phone.trim()) e.phone = t('auth.enterPhone');
    if (!password) e.password = t('auth.choosePassword');
    else if (!isPasswordValid(password)) e.password = t('auth.passwordRules');
    if (confirm !== password) e.confirm = t('auth.passwordsMismatch');
    if (!accepted) e.accepted = t('auth.acceptTerms');
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
        navigation.replace('PendingApproval');
        return;
      }
      if (!result.success) Alert.alert(t('auth.signUpFailed'), result.error || t('auth.signUpFailedDefault'));
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
      setErrors((prev) => ({ ...prev, services: t('auth.chooseService') }));
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
      Alert.alert(t('auth.signUpFailed'), result.error);
    }
  };

  const goBack = () => (step > 1 ? setStep(step - 1) : navigation.goBack());

  return (
    <AuthShell onBack={goBack} scrollKey={step}>
      {step === 1 && (
        <FadeIn>
          <AuthTitle
            icon={isWorker ? 'hard-hat' : undefined}
            title={isWorker ? t('auth.createTechnicianTitle') : t('common.createAccount')}
            subtitle={isWorker
              ? t('auth.createTechnicianSubtitle')
              : t('auth.createClientSubtitle')}
          />
          <RoleSwitch role={role} onChange={setRole} />

          <Field
            icon="person-outline"
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
            placeholder={t('auth.fullName')}
            autoCapitalize="words"
            textContentType="name"
            error={errors.name}
          />
          <Field
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            placeholder={t('auth.emailAddress')}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            error={errors.email}
          />
          <Field
            left={<CountryCodePicker country={country} onChange={setCountry} />}
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            placeholder={t('auth.phoneNumber')}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            error={errors.phone}
          />
          <Field
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            onFocus={() => setPasswordFocused(true)}
            placeholder={t('common.password')}
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
            placeholder={t('auth.confirmPassword')}
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
            label={isWorker ? t('auth.createTechnicianButton') : t('common.createAccount')}
            onPress={submitInfo}
            loading={loading}
            disabled={!!socialLoading}
          />

          <Divider label={t('auth.orSignUpWith')} />
          <SocialButtons onPress={handleSocial} loading={socialLoading} disabled={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.haveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>{t('common.login')}</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>
      )}

      {step === 2 && (
        <FadeIn>
          <Stepper steps={WORKER_STEPS} current={2} />
          <AuthTitle title={t('auth.selectServices')} subtitle={t('auth.selectServicesHint')} />
          <ServicePicker
            selected={services}
            onChange={(next) => { setServices(next); clearError('services'); }}
            error={errors.services}
          />
          <View style={styles.stepAction}>
            <PrimaryButton label={t('common.continue')} icon="arrow-forward" onPress={submitServices} />
          </View>
        </FadeIn>
      )}

      {step === 3 && (
        <FadeIn>
          <Stepper steps={WORKER_STEPS} current={3} />
          <AuthTitle title={t('auth.reviewApplication')} subtitle={t('auth.reviewApplicationHint')} />
          <View style={styles.summary}>
            <SummaryRow icon="person-outline" text={name.trim()} />
            <SummaryRow icon="mail-outline" text={email.trim().toLowerCase()} />
            <SummaryRow icon="call-outline" text={ltr(fullPhone(country, phone))} />
            <SummaryRow icon="construct-outline" text={t('auth.servicesSelected', { count: services.length })} />
          </View>
          <View style={styles.stepAction}>
            <PrimaryButton label={t('auth.sendApplication')} onPress={handleCreate} loading={loading} />
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
