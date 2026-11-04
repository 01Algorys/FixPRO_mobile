import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { AuthShell, AuthTitle, PRIMARY, INK, MUTED } from '../components/auth/AuthUI';

const ROLES = [
  {
    role: 'USER',
    title: 'Je cherche un professionnel',
    desc: 'Réservez un plombier, un électricien… près de chez vous.',
    icon: 'home-outline',
    image: require('../assets/user.png'),
  },
  {
    role: 'WORKER',
    title: 'Je suis technicien',
    desc: 'Recevez des demandes de clients et développez votre activité.',
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
    if (result.success === false) Alert.alert('Connexion impossible', result.error);
    // On success the navigator switches to the signed-in app
  };

  const firstName = social?.profile?.name?.split(' ')[0];

  return (
    <AuthShell onBack={() => navigation.goBack()}>
      <AuthTitle
        title={firstName ? `Bienvenue ${firstName} !` : 'Bienvenue !'}
        subtitle="Comment souhaitez-vous utiliser FixPro ?"
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
                    <Text style={styles.cardCtaText}>Continuer</Text>
                    <Ionicons name="arrow-forward" size={16} color={PRIMARY} />
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
