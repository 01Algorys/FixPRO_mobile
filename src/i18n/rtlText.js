import React from 'react';
import ReactNative, { I18nManager } from 'react-native';

const withDefaultStyle = (Component, defaultStyle) => {
  const Wrapped = ({ style, ...props }) => <Component {...props} style={[defaultStyle, style]} />;
  Wrapped.displayName = Component.displayName;
  return Object.assign(Wrapped, Component);
};

// iOS aligns text by the app's native language, not by React Native's layout
// direction, so Arabic text with no alignment stays on the left. React Native
// flips an explicit "left" in right-to-left layouts, so that becomes the default
// for every Text and TextInput. Runs before the screens are loaded, and only in
// right-to-left: other languages keep the plain components.
export const alignTextForRTL = () => {
  if (!I18nManager.isRTL) return;
  const { Text, TextInput } = ReactNative;
  const left = { textAlign: 'left' };
  Object.defineProperty(ReactNative, 'Text', { value: withDefaultStyle(Text, left) });
  Object.defineProperty(ReactNative, 'TextInput', { value: withDefaultStyle(TextInput, left) });
};
