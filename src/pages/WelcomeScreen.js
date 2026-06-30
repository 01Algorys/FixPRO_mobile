import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_900Black } from '@expo-google-fonts/poppins';
const { width, height } = Dimensions.get('window');
const BLUE = '#1a56db';

export default function WelcomeScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ Poppins_900Black });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={['#1a56db', '#1565c0']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Section 1 - TOP */}
      <View style={styles.topSection}>
        {/* Logo row */}
        <View style={styles.logoRow}>
          <Image
            source={require('../assets/tool.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandName} numberOfLines={0}>FixPro</Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline} numberOfLines={0}>Simple • Rapide • Fiable</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle} numberOfLines={0}>
          Trouvez le bon professionnel{'\n'}près de chez vous.
        </Text>
      </View>

      {/* Section 2 - MIDDLE */}
      <View style={styles.middleSection}>
        {/* Toolbox illustration */}
        <Image
          source={require('../assets/toolbox.png')}
          style={styles.toolboxImg}
          resizeMode="contain"
        />
      </View>

      {/* Section 3 - BOTTOM */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText} numberOfLines={0}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('RoleSelection')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBtnText} numberOfLines={0}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Section 1 - TOP
  topSection: {
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.03,
    marginTop: height * 0.1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.015,
  },
  logoImg: {
    width: width * 0.18,
    height: width * 0.18,
  },
  brandName: {
    fontSize: width * 0.16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    fontFamily: 'Poppins_900Black',
    flexShrink: 1,
  },
  tagline: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: height * 0.03,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: width * 0.04,
    color: '#fff',
    textAlign: 'center',
    lineHeight: height * 0.032,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  // Section 2 - MIDDLE
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  toolboxImg: {
    width: width * 0.75,
    height: width * 0.55,
  },
  // Section 3 - BOTTOM
  bottomSection: {
    width: width * 0.88,
    gap: height * 0.015,
    paddingBottom: height * 0.02,
    paddingHorizontal: width * 0.02,
  },
  loginBtn: {
    backgroundColor: '#fff',
    borderRadius: width * 0.08,
    paddingVertical: height * 0.018,
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: BLUE,
    flexShrink: 1,
  },
  registerBtn: {
    borderRadius: width * 0.08,
    paddingVertical: height * 0.018,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  registerBtnText: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
});
