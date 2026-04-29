import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive, wp, hp, rf, scale } from '../utils/responsive';

// Create context for responsive values
const ResponsiveContext = createContext();

/**
 * ResponsiveWrapper Component
 * Provides responsive dimensions and utilities to child components via context
 * Handles dimension changes and orientation changes
 * 
 * Usage:
 * 1. Wrap your app or individual screens:
 *    <ResponsiveWrapper>
 *      <YourApp />
 *    </ResponsiveWrapper>
 * 
 * 2. Consume context in components:
 *    const { width, height, isTablet, wp, hp, rf } = useResponsiveContext();
 */
export const ResponsiveWrapper = ({ children }) => {
  const dimensions = useResponsive();
  const insets = useSafeAreaInsets();

  const contextValue = {
    ...dimensions,
    insets,
    // Safe area aware helpers
    safeTop: insets.top,
    safeBottom: insets.bottom,
    safeLeft: insets.left,
    safeRight: insets.right,
    // Safe area aware spacing
    paddingTopWithSafe: (padding) => padding + insets.top,
    paddingBottomWithSafe: (padding) => padding + insets.bottom,
    paddingLeftWithSafe: (padding) => padding + insets.left,
    paddingRightWithSafe: (padding) => padding + insets.right,
    // Platform specific helpers
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
  };

  return (
    <ResponsiveContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
      </View>
    </ResponsiveContext.Provider>
  );
};

/**
 * Hook to use responsive context
 * Must be used within a ResponsiveWrapper
 * 
 * @returns {object} Responsive context values
 */
export const useResponsiveContext = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    console.warn('useResponsiveContext must be used within a ResponsiveWrapper');
    // Fallback to useResponsive hook if context is not available
    return useResponsive();
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default ResponsiveWrapper;
