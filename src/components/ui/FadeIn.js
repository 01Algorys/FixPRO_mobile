import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Short ease-out rise used when a section first renders; `delay` staggers
// siblings so a screen settles in order instead of popping in at once.
const FadeIn = ({ children, delay = 0, style }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default FadeIn;
