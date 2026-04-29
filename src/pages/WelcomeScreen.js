import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Image, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_900Black } from '@expo-google-fonts/poppins';

const { width, height } = Dimensions.get('window');
const BLUE = '#1a56db';

const FEATURE_ICONS = [
  { label: 'Rapide', uri: 'https://cdn-icons-png.flaticon.com/512/3468/3468081.png' },
  { label: 'Fiable', uri: 'https://cdn-icons-png.flaticon.com/512/7518/7518748.png' },
  { label: 'Qualité', uri: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' },
];

export default function WelcomeScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ Poppins_900Black });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={['#1a56db', '#1565c0']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Section 1 - TOP (fixed) */}
      <View style={styles.topSection}>
        {/* Logo row */}
        <View style={styles.logoRow}>
          <Image
            source={require('../assets/tool.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>FixPro</Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Simple • Rapide • Fiable</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Trouvez le bon professionnel{'\n'}près de chez vous.
        </Text>
      </View>

      {/* Section 2 - MIDDLE (flex: 1) */}
      <View style={styles.middleSection}>
        {/* Toolbox illustration */}
        <Image
          source={require('../assets/toolbox.png')}
          style={styles.toolboxImg}
          resizeMode="contain"
        />
      </View>

      {/* Section 3 - BOTTOM (fixed) */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('RoleSelection')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  // Section 1 - TOP (fixed)
  topSection: {
    paddingTop: height * 0.10,
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 70
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginBottom: 16,
  },
  logoImg: { width: 90, height: 90 },
  brandName: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    fontFamily: 'Poppins_900Black',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Section 2 - MIDDLE (flex: 1)
  middleSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  toolboxImg: {
    width: width * 0.9,
    height: height * 0.38,
    marginTop: 200,
  },
  // Section 3 - BOTTOM (fixed)
  bottomSection: {
    width: width * 0.88,
    gap: 12,
    marginTop: 5,
    paddingBottom: 44,
  },
  loginBtn: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
  },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: BLUE },
  registerBtn: {
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  registerBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
