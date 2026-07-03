import React from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#1a56db';

export default function PendingApprovalScreen({ navigation }) {
  return (
    <LinearGradient colors={['#1a56db', '#1565c0']} style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <Ionicons name="time-outline" size={72} color="#fff" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Compte créé avec succès !</Text>

        {/* Body */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={28} color={BLUE} />
            <Text style={styles.cardTitle}>Validation en cours</Text>
          </View>

          <Text style={styles.cardBody}>
            Votre compte professionnel a été créé et est actuellement en attente de
            validation par un administrateur.
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              Vous recevrez un e-mail dès que votre compte aura été approuvé.
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>
              L'accès à l'application vous sera accordé uniquement après validation.
            </Text>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Si vous n'avez pas reçu de réponse sous 48 h, contactez notre support.
            </Text>
          </View>
        </View>

        {/* Back to login */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons name="arrow-back-outline" size={18} color={BLUE} style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 28,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 10,
  },
  cardBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },

  notice: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  noticeText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE,
  },
});
