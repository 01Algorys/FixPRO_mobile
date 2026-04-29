import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Layout } from './theme';

const { width, height } = Dimensions.get('window');

// Breakpoints
const breakpoints = {
  small: 375,
  medium: 768,
  large: 1024,
  xlarge: 1440,
};

// Responsive padding based on screen width
const getResponsivePadding = (size) => {
  if (width < breakpoints.small) {
    return size * 0.8;
  } else if (width < breakpoints.medium) {
    return size;
  } else if (width < breakpoints.large) {
    return size * 1.3;
  } else {
    return size * 1.5;
  }
};

// Responsive font size
const getResponsiveFontSize = (size) => {
  const baseWidth = 375;
  const scaleFactor = width / baseWidth;
  return Math.min(size * scaleFactor, size * 1.3);
};

export const responsiveStyles = StyleSheet.create({
  // Responsive container
  responsiveContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Responsive card
  responsiveCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: getResponsivePadding(Spacing.lg),
    marginHorizontal: getResponsivePadding(Spacing.md),
    marginVertical: getResponsivePadding(Spacing.sm),
  },
  
  // Responsive text
  responsiveTextTitle: {
    fontSize: getResponsiveFontSize(FontSizes.xxxl),
    fontWeight: '700',
    color: Colors.text,
  },
  responsiveTextSubtitle: {
    fontSize: getResponsiveFontSize(FontSizes.xl),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  responsiveTextBody: {
    fontSize: getResponsiveFontSize(FontSizes.lg),
    color: Colors.text,
  },
  responsiveTextSmall: {
    fontSize: getResponsiveFontSize(FontSizes.md),
    color: Colors.textSecondary,
  },
  
  // Responsive button
  responsiveButton: {
    paddingVertical: getResponsivePadding(Spacing.md),
    paddingHorizontal: getResponsivePadding(Spacing.xl),
    borderRadius: BorderRadius.md,
  },
  
  // Responsive grid
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.sm,
  },
  responsiveGridItem: {
    width: width < breakpoints.medium ? '100%' : width < breakpoints.large ? '50%' : '33.33%',
    paddingHorizontal: Spacing.sm,
  },
  responsiveGridItemSmall: {
    width: width < breakpoints.medium ? '50%' : width < breakpoints.large ? '33.33%' : '25%',
    paddingHorizontal: Spacing.sm,
  },
  responsiveGridItemLarge: {
    width: width < breakpoints.medium ? '100%' : width < breakpoints.large ? '50%' : '25%',
    paddingHorizontal: Spacing.sm,
  },
  
  // Responsive spacing
  responsiveMargin: {
    margin: getResponsivePadding(Spacing.lg),
  },
  responsivePadding: {
    padding: getResponsivePadding(Spacing.lg),
  },
  
  // Responsive header
  responsiveHeader: {
    paddingVertical: getResponsivePadding(Spacing.lg),
    paddingHorizontal: getResponsivePadding(Spacing.xl),
  },
  
  // Safe area for different devices
  safeAreaTop: {
    paddingTop: Layout.isSmallDevice ? Spacing.sm : Spacing.lg,
  },
  safeAreaBottom: {
    paddingBottom: Layout.isSmallDevice ? Spacing.sm : Spacing.lg,
  },
});

// Helper functions for dynamic responsive values
export const responsive = {
  width: (percentage) => width * (percentage / 100),
  height: (percentage) => height * (percentage / 100),
  fontSize: (size) => getResponsiveFontSize(size),
  padding: (size) => getResponsivePadding(size),
  margin: (size) => getResponsivePadding(size),
  
  isSmallScreen: () => width < breakpoints.small,
  isMediumScreen: () => width >= breakpoints.small && width < breakpoints.medium,
  isLargeScreen: () => width >= breakpoints.medium,
  
  // Get appropriate layout based on screen size
  getColumns: (smallCols, mediumCols, largeCols) => {
    if (width < breakpoints.medium) return smallCols;
    if (width < breakpoints.large) return mediumCols;
    return largeCols;
  },
  
  // Get appropriate spacing based on screen size
  getSpacing: (small, medium, large) => {
    if (width < breakpoints.medium) return small;
    if (width < breakpoints.large) return medium;
    return large;
  },
};

export default responsiveStyles;
