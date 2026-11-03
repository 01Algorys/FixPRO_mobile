import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useScreenChrome } from '../context/ChromeContext';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';
import { AuthHeader, PRIMARY, INK, MUTED } from '../components/auth/AuthUI';

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

// Sign-up step 1. With route.params.google (a new Google account) the choice
// finishes the Google sign-up instead of opening the email form.
export default function RoleSelectionScreen({ navigation, route }) {
  useScreenChrome('#ffffff');
  const { loginWithGoogle } = useAuth();
  const google = route.params?.google;
  const [busyRole, setBusyRole] = useState(null);

  const choose = async (role) => {
    if (!google) {
      navigation.navigate('CreateAccount', { role });
      return;
    }
    if (role === 'WORKER') {
      navigation.navigate('GoogleWorkerSetup', google);
      return;
    }
    setBusyRole(role);
    const result = await loginWithGoogle({ accessToken: google.accessToken, role });
    setBusyRole(null);
    if (result.success === false) Alert.alert('Connexion Google', result.error);
    // On success the navigator switches to the signed-in app
  };

  const firstName = google?.profile?.name?.split(' ')[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AuthHeader
          title={firstName ? `Bienvenue ${firstName} !` : 'Créer un compte'}
          subtitle="Comment souhaitez-vous utiliser FixPro ?"
          onBack={() => navigation.goBack()}
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

        {!google && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà inscrit ?</Text>
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>Se connecter</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 22, paddingBottom: 30 },
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  footerText: { fontSize: 14.5, color: MUTED },
  footerLink: { fontSize: 14.5, color: PRIMARY, fontWeight: '700' },
});
