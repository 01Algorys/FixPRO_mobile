import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

// Styles that size/position the element in its parent; they belong on the outer
// Pressable so `flex: 1` etc. work exactly as on a plain View.
const OUTER_KEYS = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'maxWidth', 'minWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
];

// Tap feedback that feels physical: a quick, slightly springy scale-down while
// pressed instead of the flat opacity flash of TouchableOpacity.
const PressableScale = ({ children, style, scaleTo = 0.97, disabled, ...props }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: to === 1 ? 6 : 0,
    }).start();

  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = {};
  Object.keys(flat).forEach((key) => {
    (OUTER_KEYS.includes(key) ? outer : inner)[key] = flat[key];
  });
  if (outer.flex || outer.width) inner.flexGrow = 1;

  return (
    <Pressable
      {...props}
      style={outer}
      disabled={disabled}
      onPressIn={(e) => { animate(scaleTo); props.onPressIn?.(e); }}
      onPressOut={(e) => { animate(1); props.onPressOut?.(e); }}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default PressableScale;
