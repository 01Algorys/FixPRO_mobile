import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LanguageButton } from './LanguagePicker';
import { t } from '../i18n';

const BLUE = '#1a56db';

export default function LockedScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const title = route?.params?.title || t('nav.lockedTitle');
  const message = route?.params?.message || t('nav.lockedMessage');
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LanguageButton style={[styles.language, { top: insets.top + 12 }]} color={BLUE} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={40} color={BLUE} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>{t('common.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('CreateAccount')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBtnText}>{t('common.createAccount')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  language: { position: 'absolute', right: 16, zIndex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#e8effc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  loginBtn: {
    backgroundColor: BLUE,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  registerBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: BLUE,
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE,
  },
});
