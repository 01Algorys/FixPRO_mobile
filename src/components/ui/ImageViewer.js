import React from 'react';
import { Modal, View, Image, StyleSheet, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initialWindowMetrics } from 'react-native-safe-area-context';

// Full-screen photo. Modals sit above the root safe-area padding, so the close
// button uses the device's inset rather than useSafeAreaInsets (which reads 0).
const ImageViewer = ({ uri, onClose }) => (
  <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <StatusBar barStyle="light-content" />
    <Pressable style={styles.backdrop} onPress={onClose}>
      {!!uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
      <View style={[styles.close, { top: (initialWindowMetrics?.insets.top ?? 0) + 10 }]}>
        <Ionicons name="close" size={24} color="#fff" />
      </View>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
});

export default ImageViewer;
