import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, Alert,
  ActivityIndicator, Modal, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const THEME = '#1A3A6B';
const BLUE = '#1A6BFF';

export default function ProfileImagePicker({ imageUri, onImageSelected }) {
  const [loading, setLoading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'W';
    const names = name.split(' ');
    if (names.length >= 2) {
      return names[0][0].toUpperCase() + names[1][0].toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleCameraPress = async () => {
    setShowActionSheet(false);
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'FixPro a besoin d\'accéder à votre appareil photo pour prendre des photos de profil. Veuillez activer cette permission dans les paramètres de votre appareil.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,  // FIX 5: Get base64 directly from ImagePicker
      });

      // FIX 2: Guard against undefined result structure
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processImage(asset);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à l\'appareil photo');
    }
  };

  const handleGalleryPress = async () => {
    setShowActionSheet(false);
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'FixPro a besoin d\'accéder à votre galerie pour sélectionner des photos de profil. Veuillez activer cette permission dans les paramètres de votre appareil.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,  // FIX 5: Get base64 directly from ImagePicker
      });

      // FIX 2: Guard against undefined result structure
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processImage(asset);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie');
    }
  };

  const processImage = async (asset) => {
    try {
      // FIX 3: Guard against undefined asset
      if (!asset) {
        Alert.alert('Erreur', 'Image invalide. Veuillez réessayer.');
        return;
      }

      setLoading(true);

      // FIX 5: PRIMARY APPROACH - Use base64 directly from ImagePicker
      if (asset.base64) {
        // Guard: make sure base64 is valid
        if (!asset.base64 || asset.base64.length === 0) {
          Alert.alert('Erreur', 'Impossible de lire l\'image. Réessayez.');
          return;
        }

        // Detect MIME type from asset or fallback to URI extension
        const mimeType = asset.mimeType || 
          (asset.uri && asset.uri.split('.').pop().toLowerCase() === 'png' ? 'image/png' : 'image/jpeg');
        
        const base64WithPrefix = `data:${mimeType};base64,${asset.base64}`;

        // Guard: check size (2MB limit)
        const approximateSizeBytes = asset.base64.length * 0.75;
        const twoMBinBytes = 2 * 1024 * 1024;
        if (approximateSizeBytes > twoMBinBytes) {
          Alert.alert(
            'Image trop grande',
            'Veuillez choisir une image de moins de 2MB ou réduire la qualité.'
          );
          return;
        }

        // All good - pass to parent
        onImageSelected(base64WithPrefix);
        return;
      }

      // FALLBACK: If base64 is not available, try using URI with FileSystem (if available)
      if (asset.uri) {
        try {
          // FIX 1: Try to import FileSystem dynamically (may not be available)
          const FileSystem = await import('expo-file-system').catch(() => null);
          
          if (FileSystem && FileSystem.default) {
            const base64String = await FileSystem.default.readFileSync(asset.uri, {
              encoding: 'base64',
            });

            if (base64String && base64String.length > 0) {
              const extension = asset.uri.split('.').pop().toLowerCase();
              const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
              const base64WithPrefix = `data:${mimeType};base64,${base64String}`;
              onImageSelected(base64WithPrefix);
              return;
            }
          }
        } catch (fsError) {
          console.log('FileSystem not available, using alternative approach');
        }
      }

      // If we get here, neither base64 nor FileSystem worked
      Alert.alert('Erreur', 'Impossible de traiter l\'image. Veuillez réessayer.');

    } catch (error) {
      console.error('Image processing error:', error);
      Alert.alert('Erreur', 'Impossible de traiter l\'image. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Avatar Circle */}
      <View style={styles.avatarContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {getInitials('Worker')} // You can pass actual name as prop
            </Text>
          </View>
        )}
        
        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
        
        {/* Camera button */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => setShowActionSheet(true)}
          disabled={loading}
        >
          <Ionicons name="camera" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={styles.actionSheet}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCameraPress}>
              <Ionicons name="camera" size={20} color={THEME} />
              <Text style={styles.actionText}>Prendre une photo</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.actionButton} onPress={handleGalleryPress}>
              <Ionicons name="images" size={20} color={THEME} />
              <Text style={styles.actionText}>Choisir depuis la galerie</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowActionSheet(false)}>
              <Ionicons name="close" size={20} color="#ef4444" />
              <Text style={[styles.actionText, { color: '#ef4444' }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: THEME,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME,
    borderWidth: 2,
    borderColor: THEME,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionSheet: {
    backgroundColor: '#fff',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: THEME,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
});
