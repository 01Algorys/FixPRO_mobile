import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageToast = ({ visible, senderName, message, onPress, onDismiss }) => {
  if (!visible) return null;
  
  const translateY = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }).start(onDismiss);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.toastInner} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.toastIcon}>
          <Ionicons name="chatbubble" size={18} color="#fff" />
        </View>
        <View style={styles.toastContent}>
          <Text style={styles.toastSender} numberOfLines={1}>{senderName}</Text>
          <Text style={styles.toastMessage} numberOfLines={1}>{message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={16} color="#6b7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', 
    top: 50, 
    left: 16, 
    right: 16, 
    zIndex: 9999,
    backgroundColor: '#fff', 
    borderRadius: 16,
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 12, 
    elevation: 8,
  },
  toastInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    gap: 12 
  },
  toastIcon: {
    width: 38, 
    height: 38, 
    borderRadius: 19,
    backgroundColor: '#6366f1', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  toastContent: { 
    flex: 1 
  },
  toastSender: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#111827' 
  },
  toastMessage: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginTop: 2 
  },
});

export default MessageToast;
