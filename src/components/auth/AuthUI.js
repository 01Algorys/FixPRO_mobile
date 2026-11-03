import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from '../ui/PressableScale';

export const PRIMARY = '#1d5ff0';
export const INK = '#0f172a';
export const MUTED = '#64748b';

// Brand mark + title used at the top of every auth screen
export const AuthHeader = ({ title, subtitle, onBack }) => (
  <View style={styles.header}>
    <View style={styles.headerTop}>
      {onBack ? (
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </PressableScale>
      ) : <View style={styles.backBtn} />}
      <View style={styles.logoTile}>
        <Image source={require('../../assets/tool.png')} style={styles.logo} />
      </View>
      <View style={styles.backBtn} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

export const GoogleButton = ({ label = 'Continuer avec Google', onPress, loading, disabled }) => (
  <PressableScale style={[styles.googleBtn, (disabled || loading) && { opacity: 0.6 }]} onPress={onPress} disabled={disabled || loading}>
    {loading ? <ActivityIndicator color={INK} /> : (
      <>
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text style={styles.googleText}>{label}</Text>
      </>
    )}
  </PressableScale>
);

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

// Labelled input with an optional left icon or element, right element and error
export const Field = ({ label, icon, left, right, error, style, ...inputProps }) => (
  <View style={[styles.field, style]}>
    {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
    <View style={[styles.inputWrap, error && styles.inputError]}>
      {icon && <Ionicons name={icon} size={18} color="#94a3b8" />}
      {left}
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...inputProps} />
      {right}
    </View>
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>
);

// "+216" prefix for Tunisian phone numbers
export const PhonePrefix = () => (
  <View style={styles.prefix}>
    <Text style={styles.flag}>🇹🇳</Text>
    <Text style={styles.dial}>+216</Text>
    <View style={styles.prefixDivider} />
  </View>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 6, paddingBottom: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logoTile: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  logo: { width: 44, height: 44 },
  title: { fontSize: 26, fontWeight: '800', color: INK, letterSpacing: -0.5, marginTop: 18, textAlign: 'center' },
  subtitle: { fontSize: 15, color: MUTED, marginTop: 6, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },

  googleBtn: {
    height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleText: { fontSize: 16, fontWeight: '700', color: INK },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  primaryBtn: {
    height: 54, borderRadius: 16, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  primaryText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 14,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16,
  },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  input: { flex: 1, fontSize: 15.5, color: INK, paddingVertical: 0 },
  error: { color: '#dc2626', fontSize: 12.5, marginTop: 5, marginLeft: 4 },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: { fontSize: 18 },
  dial: { fontSize: 15.5, fontWeight: '700', color: INK },
  prefixDivider: { width: 1, height: 22, backgroundColor: '#e2e8f0', marginLeft: 4 },
});
