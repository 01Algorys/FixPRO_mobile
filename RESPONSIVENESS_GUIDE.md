# Responsiveness Pattern Guide for Remaining Screens

This guide explains how to apply the responsiveness pattern to the remaining 16 screens in your FixPro React Native app.

## Pattern Overview

The responsiveness solution uses three key files:
1. **src/utils/responsive.js** - Core utility functions for responsive calculations
2. **src/components/ResponsiveWrapper.js** - Context provider for responsive values
3. **Dynamic styles** - Styles created as functions that accept device parameters

## Step-by-Step Application Pattern

### 1. Import Required Dependencies

Add these imports to your screen file:

```javascript
import { useResponsive, wp, hp, rf, scale, getNumColumns } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native';
```

### 2. Add Hooks at Component Start

Inside your component, add these hooks after existing hooks:

```javascript
const { width, height, isTablet, isSmallPhone, getSpacing } = useResponsive();
const insets = useSafeAreaInsets();
```

### 3. Convert Static Styles to Dynamic Function

Change your static `StyleSheet.create` to a function that accepts device parameters:

**Before:**
```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    fontSize: 16,
  },
});
```

**After:**
```javascript
const createStyles = (width, height, isTablet, isSmallPhone, insets) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    fontSize: rf(16),
  },
});
```

### 4. Call createStyles Inside Component

Add this line after the hooks:
```javascript
const styles = createStyles(width, height, isTablet, isSmallPhone, insets);
```

### 5. Replace Hardcoded Values with Responsive Functions

| Original | Responsive Replacement |
|----------|----------------------|
| `width: 300` | `width: wp(77)` (77% of screen width) |
| `height: 200` | `height: hp(24)` (24% of screen height) |
| `fontSize: 18` | `fontSize: rf(18)` |
| `padding: 20` | `padding: wp(5)` or `padding: scale(20)` |
| `borderRadius: 12` | `borderRadius: scale(12)` |
| `margin: 16` | `margin: wp(4)` or `margin: scale(16)` |

### 6. Wrap Root View with SafeAreaView

**Before:**
```javascript
return (
  <View style={styles.container}>
    {/* content */}
  </View>
);
```

**After:**
```javascript
return (
  <SafeAreaView style={styles.container} edges={['top']}>
    {/* content */}
  </SafeAreaView>
);
```

### 7. Handle Safe Area Insets for Bottom Elements

For bottom navigation bars, action buttons, or keyboard-avoiding views:

```javascript
actionButtonsContainer: {
  paddingBottom: insets.bottom + hp(2), // Accounts for iPhone notch/home indicator
},
```

### 8. Adapt FlatList/ScrollView Columns

For grids that use `numColumns`:

```javascript
const numColumns = getNumColumns(); // Returns 1, 2, or 3+ based on device

<FlatList
  numColumns={numColumns}
  // ...
/>
```

### 9. Handle Keyboard Avoiding Views

For screens with text inputs:

```javascript
import { KeyboardAvoidingView, Platform } from 'react-native';

// In JSX
<KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={insets.bottom}
>
  {/* content */}
</KeyboardAvoidingView>
```

## Responsive Function Reference

### wp(percent)
- Calculates width as percentage of screen width
- Example: `wp(50)` = 50% of screen width
- Use for: container widths, margins, padding

### hp(percent)
- Calculates height as percentage of screen height
- Example: `hp(10)` = 10% of screen height
- Use for: container heights, margins, padding

### rf(size)
- Responsive font size based on screen width
- Example: `rf(16)` scales appropriately
- Use for: all fontSize values

### scale(value)
- Scales any value based on screen width
- Example: `scale(12)` for border radius
- Use for: padding, margin, border radius, icon sizes

### getNumColumns()
- Returns appropriate column count for grids
- Small phones (<360px): 1 column
- Normal phones (360-767px): 2 columns
- Tablets (768-1023px): 3 columns
- Large tablets (>=1024px): 4 columns

### Device Flags
- `isSmallPhone` - width < 360
- `isTablet` - width >= 768
- `isLargePhone` - width >= 360 && width < 768

## Common Conversion Examples

### Cards and Containers
```javascript
// Before
card: {
  width: '100%',
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
}

// After
card: {
  width: '100%',
  padding: wp(4),
  borderRadius: scale(12),
  marginBottom: hp(1.5),
}
```

### Typography
```javascript
// Before
title: {
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 8,
}

// After
title: {
  fontSize: rf(24),
  fontWeight: 'bold',
  marginBottom: hp(1),
}
```

### Images and Avatars
```javascript
// Before
avatar: {
  width: 50,
  height: 50,
  borderRadius: 25,
}

// After
avatar: {
  width: scale(50),
  height: scale(50),
  borderRadius: scale(25),
}
```

### Buttons
```javascript
// Before
button: {
  padding: 16,
  borderRadius: 8,
  fontSize: 16,
}

// After
button: {
  paddingVertical: hp(2),
  paddingHorizontal: wp(4),
  borderRadius: scale(8),
  fontSize: rf(16),
}
```

## Testing Your Changes

After applying responsiveness to a screen:

1. Test on different screen sizes using Expo's device preview
2. Test both portrait and landscape orientations
3. Verify that:
   - Text is readable on small screens
   - Elements don't overflow on small screens
   - Layout doesn't feel stretched on tablets
   - Bottom elements are visible on devices with notches
   - Keyboard doesn't hide input fields

## Remaining Screens to Update

Apply this pattern to these remaining screens:
- Auth screens (Login, Register, ForgotPassword)
- Profile screens (UserProfile, WorkerProfile)
- Other listing/detail screens
- Settings screens
- Any other custom screens

## Quick Checklist for Each Screen

- [ ] Import responsive utilities and useSafeAreaInsets
- [ ] Add useResponsive and useSafeAreaInsets hooks
- [ ] Convert StyleSheet.create to createStyles function
- [ ] Call createStyles with device parameters
- [ ] Replace hardcoded pixel values with wp/hp/rf/scale
- [ ] Wrap root view with SafeAreaView
- [ ] Add safe area padding to bottom elements
- [ ] Adapt numColumns for FlatList if applicable
- [ ] Handle KeyboardAvoidingView if screen has inputs
- [ ] Test on multiple device sizes
