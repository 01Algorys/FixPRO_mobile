import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BLUE = '#1a56db';

export default function RoleSelectionScreen({ navigation }) {
  return (
    <LinearGradient colors={['#1a56db', '#1565c0']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Decorative background circles */}
      <View style={[styles.bgCircle, { top: -60, right: -60, width: 200, height: 200 }]} />
      <View style={[styles.bgCircle, { bottom: 100, left: -80, width: 250, height: 250 }]} />

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Choisissez votre rôle</Text>
        <Text style={styles.subtitle}>
          Comment souhaitez-vous{'\n'}utiliser FixPro ?
        </Text>
      </View>

      {/* Cards */}
      <View style={styles.cardsContainer}>

        {/* Client card */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => navigation.navigate('CreateAccount', { role: 'USER' })}
          activeOpacity={0.88}
        >
          <View style={styles.roleIconBox}>
            <Ionicons name="person-outline" size={26} color={BLUE} />
          </View>
          <View style={styles.roleTextBlock}>
            <Text style={styles.roleTitle}>Je suis un particulier</Text>
            <Text style={styles.roleDesc}>J'ai besoin d'un service{'\n'}à domicile</Text>
          </View>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
            style={styles.roleIllustration}
            resizeMode="contain"
          />
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Worker card */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => navigation.navigate('CreateAccount', { role: 'WORKER' })}
          activeOpacity={0.88}
        >
          <View style={styles.roleIconBox}>
            <Ionicons name="construct-outline" size={26} color={BLUE} />
          </View>
          <View style={styles.roleTextBlock}>
            <Text style={styles.roleTitle}>Je suis un professionnel</Text>
            <Text style={styles.roleDesc}>Je souhaite proposer{'\n'}mes services</Text>
          </View>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140051.png' }}
            style={styles.roleIllustration}
            resizeMode="contain"
          />
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 56 },

  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },

  titleBlock: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },

  cardsContainer: { gap: 16 },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  roleIconBox: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  roleTextBlock: { flex: 1 },
  roleTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  roleDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  roleIllustration: { width: 80, height: 80 },
});
