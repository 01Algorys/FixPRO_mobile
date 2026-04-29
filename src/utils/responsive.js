import { Dimensions, useWindowDimensions } from 'react-native';

// Get initial dimensions
const { width: initialWidth, height: initialHeight } = Dimensions.get('window');

// Base dimensions for standard phone (iPhone 13/14 reference)
const baseWidth = 390;
const baseHeight = 844;

// Device type thresholds
const SMALL_PHONE_THRESHOLD = 360;
const TABLET_THRESHOLD = 768;

/**
 * Responsive utility for React Native
 * Provides helper functions for width, height, font scaling, and device detection
 */

/**
 * Calculate width percentage based on screen width
 * @param {number} percent - Percentage value (e.g., 50 for 50%)
 * @param {number} customWidth - Optional custom width to calculate from
 * @returns {number} Calculated width in pixels
 */
export const wp = (percent, customWidth = null) => {
  const screenWidth = customWidth || initialWidth;
  return (screenWidth * percent) / 100;
};

/**
 * Calculate height percentage based on screen height
 * @param {number} percent - Percentage value (e.g., 50 for 50%)
 * @param {number} customHeight - Optional custom height to calculate from
 * @returns {number} Calculated height in pixels
 */
export const hp = (percent, customHeight = null) => {
  const screenHeight = customHeight || initialHeight;
  return (screenHeight * percent) / 100;
};

/**
 * Calculate responsive font size
 * Scales font based on screen width relative to base width
 * @param {number} size - Font size in pixels
 * @returns {number} Scaled font size
 */
export const rf = (size) => {
  const scaleFactor = initialWidth / baseWidth;
  return Math.round(size * scaleFactor);
};

/**
 * Scale function for padding, margin, and other spacing values
 * Scales based on screen width relative to base width
 * @param {number} value - Pixel value to scale
 * @returns {number} Scaled value
 */
export const scale = (value) => {
  const scaleFactor = initialWidth / baseWidth;
  return Math.round(value * scaleFactor);
};

/**
 * Device type detection flags
 */
export const isSmallPhone = initialWidth < SMALL_PHONE_THRESHOLD;
export const isTablet = initialWidth >= TABLET_THRESHOLD;
export const isLargePhone = initialWidth >= SMALL_PHONE_THRESHOLD && initialWidth < TABLET_THRESHOLD;

/**
 * Get current device type based on width
 * @param {number} width - Screen width
 * @returns {string} Device type: 'small', 'phone', 'tablet'
 */
export const getDeviceType = (width = initialWidth) => {
  if (width < SMALL_PHONE_THRESHOLD) return 'small';
  if (width >= TABLET_THRESHOLD) return 'tablet';
  return 'phone';
};

/**
 * Get number of columns for FlatList based on device width
 * @param {number} customWidth - Optional custom width
 * @returns {number} Number of columns (1 for small, 2 for phone, 3+ for tablet)
 */
export const getNumColumns = (customWidth = null) => {
  const width = customWidth || initialWidth;
  if (width < SMALL_PHONE_THRESHOLD) return 1;
  if (width >= TABLET_THRESHOLD) {
    if (width >= 1024) return 4;
    return 3;
  }
  return 2;
};

/**
 * Get appropriate spacing based on device size
 * @param {number} small - Spacing for small phones
 * @param {number} phone - Spacing for normal phones
 * @param {number} tablet - Spacing for tablets
 * @returns {number} Appropriate spacing value
 */
export const getSpacing = (small, phone, tablet) => {
  if (isSmallPhone) return small;
  if (isTablet) return tablet;
  return phone;
};

/**
 * Hook to get current window dimensions
 * Use this in components for dynamic dimension changes
 * @returns {object} { width, height, isPortrait, isLandscape, isSmallPhone, isTablet, deviceType }
 */
export const useResponsiveDimensions = () => {
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const isLandscape = width > height;
  const currentIsSmallPhone = width < SMALL_PHONE_THRESHOLD;
  const currentIsTablet = width >= TABLET_THRESHOLD;
  const deviceType = getDeviceType(width);

  return {
    width,
    height,
    isPortrait,
    isLandscape,
    isSmallPhone: currentIsSmallPhone,
    isTablet: currentIsTablet,
    deviceType,
  };
};

/**
 * Hook for responsive calculations with current dimensions
 * @returns {object} { wp, hp, rf, scale, getNumColumns, getSpacing, ...dimensions }
 */
export const useResponsive = () => {
  const dimensions = useResponsiveDimensions();
  
  return {
    ...dimensions,
    wp: (percent) => wp(percent, dimensions.width),
    hp: (percent) => hp(percent, dimensions.height),
    rf: (size) => {
      const scaleFactor = dimensions.width / baseWidth;
      return Math.round(size * scaleFactor);
    },
    scale: (value) => {
      const scaleFactor = dimensions.width / baseWidth;
      return Math.round(value * scaleFactor);
    },
    getNumColumns: () => getNumColumns(dimensions.width),
    getSpacing: (small, phone, tablet) => {
      if (dimensions.isSmallPhone) return small;
      if (dimensions.isTablet) return tablet;
      return phone;
    },
  };
};

/**
 * Listen for dimension changes
 * @param {function} callback - Callback function called when dimensions change
 * @returns {function} Cleanup function to remove listener
 */
export const addDimensionChangeListener = (callback) => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback(window);
  });
  return () => subscription?.remove();
};

// Export initial dimensions for backward compatibility
export const dimensions = {
  width: initialWidth,
  height: initialHeight,
  isPortrait: initialHeight >= initialWidth,
  isLandscape: initialWidth > initialHeight,
  isSmallPhone,
  isTablet,
  isLargePhone,
  deviceType: getDeviceType(),
};

// Default export with all utilities
export default {
  wp,
  hp,
  rf,
  scale,
  isSmallPhone,
  isTablet,
  isLargePhone,
  getDeviceType,
  getNumColumns,
  getSpacing,
  useResponsiveDimensions,
  useResponsive,
  addDimensionChangeListener,
  dimensions,
};
