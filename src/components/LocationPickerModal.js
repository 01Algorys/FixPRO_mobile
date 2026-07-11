import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { getCurrentCoords } from '../utils/location';

const DEFAULT_REGION = {
  // Tunis, Tunisia — reasonable fallback center for this app's market when
  // location permission is denied and the device has no last-known position.
  latitude: 36.8065,
  longitude: 10.1815,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Free-tier OpenStreetMap search — no API key required. Nominatim's usage
// policy requires a descriptive User-Agent and reasonable request volume,
// which the 400ms debounce below respects.
const searchAddress = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'FixProMobileApp/1.0 (contact@fixpro.com)' },
  });
  if (!response.ok) return [];
  return response.json();
};

const LocationPickerModal = ({ visible, initialCoords, onConfirm, onClose }) => {
  const mapRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [address, setAddress] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const init = async () => {
      if (initialCoords?.latitude && initialCoords?.longitude) {
        setRegion({ ...DEFAULT_REGION, ...initialCoords });
        return;
      }
      const coords = await getCurrentCoords();
      if (coords) {
        setRegion({ ...DEFAULT_REGION, ...coords });
      }
    };
    init();
  }, [visible, initialCoords]);

  const reverseGeocodeCenter = useCallback(async (latitude, longitude) => {
    try {
      setResolvingAddress(true);
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = results?.[0];
      if (place) {
        const parts = [place.streetNumber, place.street, place.city || place.subregion]
          .filter(Boolean);
        setAddress(parts.join(', ') || place.name || '');
      }
    } catch (error) {
      console.error('reverseGeocodeCenter error:', error);
    } finally {
      setResolvingAddress(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      reverseGeocodeCenter(region.latitude, region.longitude);
    }
    // Only run when the modal opens with its initial region — subsequent
    // updates are driven by onRegionChangeComplete below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
    reverseGeocodeCenter(newRegion.latitude, newRegion.longitude);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!text || text.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await searchAddress(text.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('Address search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (result) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(newRegion);
    setAddress(result.display_name);
    setSearchQuery('');
    setSearchResults([]);
    mapRef.current?.animateToRegion(newRegion, 400);
  };

  const handleConfirm = () => {
    onConfirm({
      address,
      latitude: region.latitude,
      longitude: region.longitude,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choisir un emplacement</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une adresse..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searching && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          {searchResults.length > 0 && (
            <FlatList
              style={styles.resultsList}
              data={searchResults}
              keyExtractor={(item) => String(item.place_id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.resultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
          />
          <View pointerEvents="none" style={styles.centerPinContainer}>
            <Ionicons name="location" size={40} color={Colors.error} />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.addressPreview}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.addressPreviewText} numberOfLines={2}>
              {resolvingAddress ? 'Résolution de l\'adresse...' : (address || 'Adresse inconnue')}
            </Text>
          </View>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Ionicons name="checkmark-outline" size={20} color={Colors.textLight} />
            <Text style={styles.confirmButtonText}>Utiliser cet emplacement</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 78,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  resultsList: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 220,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmButtonText: {
    color: Colors.textLight,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default LocationPickerModal;
