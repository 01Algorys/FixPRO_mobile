import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { AuthShell, AuthTitle, PRIMARY, INK, MUTED } from '../components/auth/AuthUI';
import { t } from '../i18n';
import { directional } from '../i18n/format';

const ROLES = [
  {
    role: 'USER',
    title: t('auth.lookingForPro'),
    desc: t('auth.lookingForProDesc'),
    icon: 'home-outline',
    image: require('../assets/user.png'),
  },
  {
    role: 'WORKER',
    title: t('auth.imTechnician'),
    desc: t('auth.imTechnicianDesc'),
    icon: 'construct-outline',
    image: require('../assets/worker.png'),
  },
];

// Role choice for a new Google / Apple account signing in from the login
// screen. route.params.social = { provider, credentials, profile }.
export default function RoleSelectionScreen({ navigation, route }) {
  const { loginWithSocial } = useAuth();
  const social = route.params?.social;
  const [busyRole, setBusyRole] = useState(null);

  const choose = async (role) => {
    if (role === 'WORKER') {
      navigation.navigate('SocialWorkerSetup', social);
      return;
    }
    setBusyRole(role);
    const result = await loginWithSocial(social.provider, { credentials: social.credentials, role });
    setBusyRole(null);
    if (result.success === false) Alert.alert(t('auth.signInFailed'), result.error);
    // On success the navigator switches to the signed-in app
  };

  const firstName = social?.profile?.name?.split(' ')[0];

  return (
    <AuthShell onBack={() => navigation.goBack()}>
      <AuthTitle
        title={firstName ? t('auth.welcomeName', { name: firstName }) : t('auth.welcome')}
        subtitle={t('auth.howToUse')}
      />

      {ROLES.map((r, i) => (
        <FadeIn key={r.role} delay={i * 70}>
          <PressableScale style={styles.card} onPress={() => choose(r.role)} disabled={!!busyRole}>
            <View style={styles.cardText}>
              <View style={styles.iconTile}>
                <Ionicons name={r.icon} size={22} color={PRIMARY} />
              </View>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.cardDesc}>{r.desc}</Text>
              <View style={styles.cardCta}>
                {busyRole === r.role ? <ActivityIndicator size="small" color={PRIMARY} /> : (
                  <>
                    <Text style={styles.cardCtaText}>{t('common.continue')}</Text>
                    <Ionicons name={directional('arrow-forward')} size={16} color={PRIMARY} />
                  </>
                )}
              </View>
            </View>
            <Image source={r.image} style={styles.cardImage} resizeMode="contain" />
          </PressableScale>
        </FadeIn>
      ))}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6f9ff', borderRadius: 24, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: '#e3ecff', overflow: 'hidden',
  },
  cardText: { flex: 1, paddingRight: 8 },
  iconTile: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 17.5, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  cardDesc: { fontSize: 13.5, color: MUTED, marginTop: 4, lineHeight: 19 },
  cardCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, height: 20 },
  cardCtaText: { color: PRIMARY, fontSize: 14.5, fontWeight: '700' },
  cardImage: { width: 104, height: 124 },
});
