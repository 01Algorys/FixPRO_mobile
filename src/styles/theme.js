import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const scale = (size) => {
  const baseWidth = 375; // iPhone X base width
  return (width / baseWidth) * size;
};

export const Colors = {
  // Main colors from the design
  primary: '#1A3763', // Dark blue header
  primaryLight: '#2b80ff',
  primaryDark: '#0A2753',
  iconLight: '#1b65d4',
  secondary: '#764ba2',
  accent: '#eab308', // Yellow stars/accent
  success: '#22c55e', // Green for certified badges
  error: '#ef4444',
  warning: '#f97316',
  info: '#024bc0',
  
  // Gradients
  gradientStart: '#1A3763',
  gradientEnd: '#764ba2',
  
  // Backgrounds
  background: '#f8f9fa', // Light grey background
  card: '#ffffff',
  input: '#f9f9f9',
  headerBackground: '#0b377a', // Dark blue header background
  
  // Text
  text: '#1a1a1a', // Dark text for better contrast
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#ffffff', // White text on dark background
  
  // Service category colors
  plumbing: '#3b82f6', // Blue for plumbing
  electrical: '#eab308', // Yellow for electricity
  hvac: '#22c55e', // Green for climate
  painting: '#f97316', // Orange for painting
  
  // Borders
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  
  // Shadows
  shadow: '#000000',
  
  // Rating
  star: '#eab308', // Yellow for stars
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSizes = {
  xs: scale(10),
  sm: scale(12),
  md: scale(14),
  lg: scale(16),
  xl: scale(18),
  xxl: scale(20),
  xxxl: scale(24),
  huge: scale(32),
};

export const FontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const ShadowStyles = {
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  extraLarge: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Layout = {
  width,
  height,
  scale,
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 768,
  isLargeDevice: width >= 768,
};

export default {
  Colors,
  Spacing,
  FontSizes,
  FontWeights,
  BorderRadius,
  ShadowStyles,
  Layout,
};
