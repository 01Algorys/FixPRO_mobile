import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_900Black } from '@expo-google-fonts/poppins';
import PressableScale from '../ui/PressableScale';
import { useScreenChrome } from '../../context/ChromeContext';
import { isAppleSignInAvailable } from '../../services/appleAuth';

export const PRIMARY = '#1d5ff0';
export const INK = '#0f172a';
export const MUTED = '#64748b';

const BRAND_TOP = '#1a56db';
const BRAND_BOTTOM = '#dbe9fd';

// Public pages for the sign-up checkbox; empty until they are hosted
const TERMS_URL = '';
const PRIVACY_URL = '';

// Blue branded background with the logo, and the screen's content on a white
// card. `scrollKey` scrolls back to the top when it changes (a new step).
export const AuthShell = ({ onBack, scrollKey, children }) => {
  useScreenChrome(BRAND_TOP, BRAND_BOTTOM);
  const [fontsLoaded] = useFonts({ Poppins_900Black });
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [scrollKey]);

  return (
    <LinearGradient colors={[BRAND_TOP, '#2f7bf0', BRAND_BOTTOM]} locations={[0, 0.5, 1]} style={styles.shell}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.shellContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            {!!onBack && (
              <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={onBack}>
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </PressableScale>
            )}
            <View style={styles.logoRow}>
              <Image source={require('../../assets/tool.png')} style={styles.logo} resizeMode="contain" />
              <Text style={[styles.brandName, fontsLoaded && { fontFamily: 'Poppins_900Black' }]}>FixPro</Text>
            </View>
            <Text style={styles.tagline}>Simple • Rapide • Fiable</Text>
          </View>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export const AuthTitle = ({ title, subtitle, icon }) => (
  <View style={styles.titleBlock}>
    <View style={styles.titleRow}>
      {!!icon && <MaterialCommunityIcons name={icon} size={30} color={PRIMARY} />}
      <Text style={styles.title}>{title}</Text>
    </View>
    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const ROLES = [
  { role: 'USER', title: 'Client', hint: 'Je cherche un professionnel', icon: 'account-outline' },
  { role: 'WORKER', title: 'Technicien', hint: 'Je propose mes services', icon: 'hard-hat' },
];

export const RoleSwitch = ({ role, onChange }) => (
  <View style={styles.roleSwitch}>
    {ROLES.map((r) => {
      const active = r.role === role;
      const content = (
        <>
          <MaterialCommunityIcons name={r.icon} size={26} color={active ? '#fff' : '#1e3a8a'} />
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.roleTitle, active && styles.onBlue]}>{r.title}</Text>
            <Text style={[styles.roleHint, active && styles.onBlue]} numberOfLines={2}>{r.hint}</Text>
          </View>
        </>
      );
      return (
        <PressableScale key={r.role} style={styles.roleItem} onPress={() => onChange(r.role)}>
          {active ? (
            <LinearGradient colors={['#2f7bf0', '#1a56db']} style={styles.roleInner}>{content}</LinearGradient>
          ) : (
            <View style={[styles.roleInner, styles.roleInactive]}>{content}</View>
          )}
        </PressableScale>
      );
    })}
  </View>
);

// Numbered progress of the technician sign-up (`current` starts at 1)
export const Stepper = ({ steps, current }) => (
  <View style={styles.stepper}>
    {steps.map((label, i) => {
      const number = i + 1;
      const active = number === current;
      return (
        <React.Fragment key={label}>
          {i > 0 && <View style={[styles.stepLine, number <= current && styles.stepLineDone]} />}
          <View style={styles.step}>
            <View style={[styles.stepDot, number < current && styles.stepDotDone, active && styles.stepDotActive]}>
              <Text style={[styles.stepNumber, active && styles.onBlue]}>{number}</Text>
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

const openLegalPage = (url) => {
  if (url) Linking.openURL(url).catch(() => {});
  else Alert.alert('Bientôt disponible', 'Cette page sera publiée prochainement.');
};

export const TermsCheckbox = ({ checked, onChange, error }) => (
  <View style={styles.terms}>
    <View style={styles.termsRow}>
      <TouchableOpacity
        style={[styles.checkbox, checked && styles.checkboxOn]}
        onPress={() => onChange(!checked)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {checked && <Ionicons name="checkmark" size={17} color="#fff" />}
      </TouchableOpacity>
      <Text style={styles.termsText}>
        J'accepte les{' '}
        <Text style={styles.termsLink} onPress={() => openLegalPage(TERMS_URL)}>Conditions d'utilisation</Text>
        {' '}et la{' '}
        <Text style={styles.termsLink} onPress={() => openLegalPage(PRIVACY_URL)}>Politique de confidentialité</Text>.
      </Text>
    </View>
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>
);

const SocialButton = ({ label, icon, iconColor, onPress, loading, disabled }) => (
  <PressableScale style={[styles.socialBtn, (disabled || loading) && { opacity: 0.6 }]} onPress={onPress} disabled={disabled || loading}>
    {loading ? <ActivityIndicator color={INK} /> : (
      <>
        <Ionicons name={icon} size={21} color={iconColor} />
        <Text style={styles.socialText}>{label}</Text>
      </>
    )}
  </PressableScale>
);

// Google, and Apple on iOS devices that support it.
// `loading` is the provider in progress ('google' | 'apple' | null).
export const SocialButtons = ({ loading, disabled, onPress }) => {
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => { isAppleSignInAvailable().then(setAppleAvailable); }, []);
  return (
    <View style={styles.socialButtons}>
      <SocialButton
        label="Google"
        icon="logo-google"
        iconColor="#4285F4"
        onPress={() => onPress('google')}
        loading={loading === 'google'}
        disabled={disabled || !!loading}
      />
      {appleAvailable && (
        <SocialButton
          label="Apple"
          icon="logo-apple"
          iconColor="#000"
          onPress={() => onPress('apple')}
          loading={loading === 'apple'}
          disabled={disabled || !!loading}
        />
      )}
    </View>
  );
};

export const Divider = ({ label = 'ou' }) => (
  <View style={styles.divider}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>{label}</Text>
    <View style={styles.dividerLine} />
  </View>
);

export const PrimaryButton = ({ label, onPress, loading, disabled, icon }) => (
  <PressableScale style={[styles.primaryBtn, (disabled || loading) && { opacity: 0.6 }]} onPress={onPress} disabled={disabled || loading}>
    {loading ? <ActivityIndicator color="#fff" /> : (
      <>
        <Text style={styles.primaryText}>{label}</Text>
        {icon && <Ionicons name={icon} size={18} color="#fff" />}
      </>
    )}
  </PressableScale>
);

// Input with an optional label, left icon or element, right element and error
export const Field = ({ label, icon, left, right, error, style, ...inputProps }) => (
  <View style={[styles.field, style]}>
    {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
    <View style={[styles.inputWrap, error && styles.inputError]}>
      {icon && <Ionicons name={icon} size={20} color="#1e3a8a" />}
      {left}
      <TextInput style={styles.input} placeholderTextColor="#64748b" {...inputProps} />
      {right}
    </View>
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>
);

const styles = StyleSheet.create({
  shell: { flex: 1 },
  shellContent: { flexGrow: 1, paddingHorizontal: 10, paddingBottom: 14 },
  brand: { alignItems: 'center', paddingTop: 8, paddingBottom: 18 },
  backBtn: { position: 'absolute', left: 6, top: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logo: { width: 44, height: 44 },
  brandName: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 1.2, marginTop: 2 },
  card: {
    flexGrow: 1, backgroundColor: '#fff', borderRadius: 28, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 20,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 4,
  },

  titleBlock: { alignItems: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#10204d', letterSpacing: -0.5, textAlign: 'center', flexShrink: 1 },
  subtitle: { fontSize: 14.5, color: '#334155', marginTop: 6, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

  roleSwitch: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  roleItem: { flex: 1 },
  roleInner: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16 },
  roleInactive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  roleTitle: { fontSize: 16, fontWeight: '800', color: INK },
  roleHint: { fontSize: 11.5, color: '#334155', marginTop: 1 },
  onBlue: { color: '#fff' },

  stepper: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  step: { alignItems: 'center', width: 92 },
  stepDot: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9e2f2',
  },
  stepDotDone: { backgroundColor: '#dfe7f5', borderColor: '#dfe7f5' },
  stepDotActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stepNumber: { fontSize: 15, fontWeight: '700', color: INK },
  stepLabel: { fontSize: 12.5, color: '#334155', marginTop: 6 },
  stepLabelActive: { color: '#1e3a8a', fontWeight: '800' },
  stepLine: { flex: 1, maxWidth: 44, height: 3, borderRadius: 2, backgroundColor: '#e8eef8', marginTop: 17, marginHorizontal: -18 },
  stepLineDone: { backgroundColor: '#b9c6dd' },

  terms: { marginTop: 4, marginBottom: 16 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 2 },
  checkbox: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: '#475569',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  termsText: { flex: 1, fontSize: 14, color: INK, lineHeight: 21 },
  termsLink: { color: PRIMARY, textDecorationLine: 'underline' },

  socialButtons: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, height: 52, borderRadius: 15, borderWidth: 1, borderColor: '#d9e2f2', backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  socialText: { fontSize: 16, fontWeight: '700', color: INK },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 14, color: '#334155', fontWeight: '500' },

  primaryBtn: {
    height: 54, borderRadius: 27, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  primaryText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },

  field: { marginBottom: 11 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9e2f2', borderRadius: 15,
  },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  input: { flex: 1, fontSize: 15.5, color: INK, paddingVertical: 0 },
  error: { color: '#dc2626', fontSize: 12.5, marginTop: 5, marginLeft: 4 },
});
