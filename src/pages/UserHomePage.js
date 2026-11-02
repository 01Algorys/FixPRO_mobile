import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import apiService from '../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../styles/theme';
import { useResponsive, wp, rf, scale } from '../utils/responsive';
import { getCurrentCoords, reverseGeocodeCity } from '../utils/location';
import { categoryMeta, shortName, formatDistance } from '../utils/categoryMeta';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SearchResultsOverlay from '../components/SearchResultsOverlay';

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;
const FAVORITES_KEY = 'favoriteWorkers';

const ACCENT = '#38d6f5';
const NAVY = '#0b3fb3';

const CategoryIcon = ({ meta, size }) =>
  meta.lib === 'mci' ? (
    <MaterialCommunityIcons name={meta.icon} size={size} color={meta.color} />
  ) : (
    <Ionicons name={meta.icon} size={size} color={meta.color} />
  );

const UserHomePage = ({ navigation }) => {
  const { user, isGuest } = useAuth();
  const { unreadMessages } = useNotifications();
  const { width } = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = createStyles(width, insets);
  const [workers, setWorkers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userData, setUserData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ categories: [], services: [], workers: [], popular: [] });
  const [recentSearches, setRecentSearches] = useState([]);
  const searchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  useEffect(() => {
    loadUserLocation();
    loadData();
    loadRecentSearches();
    loadFavorites();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      setRecentSearches(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const persistRecentSearch = async (term) => {
    if (!term?.trim()) return;
    try {
      const next = [term, ...recentSearches.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(next);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to persist recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const toggleFavorite = async (workerId) => {
    const next = favorites.includes(workerId)
      ? favorites.filter((id) => id !== workerId)
      : [...favorites, workerId];
    setFavorites(next);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  // Runs the initial "popular searches" fetch (empty q) when the search box
  // gains focus, and again with debounced live results as the user types.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!searchQuery.trim()) {
      if (searchFocused) {
        apiService.search('').then((res) => setSearchResults(res.data || res)).catch(() => {});
      }
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await apiService.search(searchQuery.trim());
        setSearchResults(res.data || res);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, searchFocused]);

  const guardedNavigate = (screen, params) => {
    if (isGuest) {
      Alert.alert(
        'Connexion requise',
        'Connectez-vous ou créez un compte pour accéder à cette fonctionnalité.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    navigation.navigate(screen, params);
  };

  const handleSelectSearchCategory = (item) => {
    persistRecentSearch(item.label);
    setSearchFocused(false);
    setSearchQuery('');
    guardedNavigate('ServiceWorkers', { category: item.id.toLowerCase?.() || item.id });
  };

  const handleSelectSearchService = (item) => {
    persistRecentSearch(item.label);
    setSearchFocused(false);
    setSearchQuery('');
    guardedNavigate('ServiceWorkers', { category: item.category?.toLowerCase?.() });
  };

  const handleSelectSearchWorker = (item) => {
    persistRecentSearch(item.label);
    setSearchFocused(false);
    setSearchQuery('');
    guardedNavigate('WorkerProfile', { workerId: item.id });
  };

  const handleSelectRecentSearch = (term) => {
    setSearchQuery(term);
  };

  const loadUserLocation = async () => {
    try {
      setLocatingUser(true);
      const currentCoords = await getCurrentCoords();
      if (!currentCoords) return;

      setCoords(currentCoords);

      const city = await reverseGeocodeCity(currentCoords.latitude, currentCoords.longitude);
      if (city) setCityName(city);

      // Re-fetch workers now that we can sort them by distance, without
      // flashing the full-screen loader again.
      loadData(currentCoords, { silent: true });
    } catch (error) {
      console.error('Failed to get user location:', error);
    } finally {
      setLocatingUser(false);
    }
  };

  const loadData = async (currentCoords = coords, { silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const workersParams = { limit: 6, minRating: 4.0 };
      if (currentCoords) {
        workersParams.lat = currentCoords.latitude;
        workersParams.lng = currentCoords.longitude;
        // Distance sorting takes priority over the rating filter so
        // the closest professionals aren't excluded from the list.
        delete workersParams.minRating;
      }

      const [categoriesData, topWorkersData, userProfile] = await Promise.all([
        apiService.getPublicCategories().catch(() => null),
        apiService.getWorkers(workersParams),
        apiService.getUserProfile().catch(() => null)
      ]);

      if (categoriesData) setCategories(categoriesData.data || categoriesData || []);

      const workersData = topWorkersData.data?.workers || topWorkersData.workers || topWorkersData.data || topWorkersData || [];
      setWorkers(workersData.map((worker) => ({
        ...worker,
        name: worker.user?.name || worker.name || 'Technicien',
        averageRating: worker.averageRating || worker.rating || 0,
        totalReviews: worker.totalReviews || worker.reviewCount || 0,
        isActive: worker.isActive !== undefined ? worker.isActive : true,
      })));

      setUserData(userProfile ? (userProfile.data || userProfile) : user);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (!silent) Alert.alert('Erreur', 'Impossible de charger les données');
      setUserData(user);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleWorkerClick = (worker) => {
    guardedNavigate('WorkerProfile', { workerId: worker.id });
  };

  const handleReservePress = (worker) => {
    guardedNavigate('ReservationDetails', { workerId: worker.id });
  };

  const handleCategoryClick = (category) => {
    guardedNavigate('ServiceWorkers', { category: category.key.toLowerCase() });
  };

  const handleSeeAllProfessionals = () => {
    guardedNavigate('Professionals');
  };

  const displayCityName = cityName
    || userData?.user?.location?.city
    || userData?.location?.city
    || 'Ma position';
  const firstName = (userData?.user?.name || user?.name || (isGuest ? 'Invité' : '')).split(' ')[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1a56db', NAVY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerGlow} />
          <View style={styles.headerTop}>
            <View style={styles.brand}>
              <Image source={require('../assets/tool.png')} style={styles.brandLogo} />
              <View>
                <Text style={styles.brandName}>
                  Fix<Text style={{ color: ACCENT }}>Pro</Text>
                </Text>
                <Text style={styles.brandTagline}>Simple • rapide • fiable</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.locationPill}
                onPress={loadUserLocation}
                disabled={locatingUser}
                activeOpacity={0.8}
              >
                {locatingUser ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="location" size={15} color="#fff" />
                )}
                <Text style={styles.locationText} numberOfLines={1}>{displayCityName}</Text>
                <Ionicons name="chevron-down" size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bellButton} onPress={() => guardedNavigate('Messages')}>
                <Ionicons name="notifications" size={24} color="#fff" />
                {unreadMessages > 0 && <View style={styles.bellBadge} />}
              </TouchableOpacity>
            </View>
          </View>

          {!!firstName && <Text style={styles.greeting}>Bonjour {firstName} 👋</Text>}
          <Text style={styles.heroTitle}>
            Quel service{'\n'}avez-vous <Text style={{ color: ACCENT }}>besoin ?</Text>
          </Text>

          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={1}
            onPress={() => searchInputRef.current?.focus()}
          >
            <Ionicons name="search" size={22} color="#6b7280" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher un service..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.filterButton} onPress={handleSeeAllProfessionals}>
              <Ionicons name="options-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>

          {searchFocused && (
            <View style={styles.searchOverlayWrap}>
              <SearchResultsOverlay
                query={searchQuery}
                loading={searchLoading}
                results={searchResults}
                recentSearches={recentSearches}
                onSelectCategory={handleSelectSearchCategory}
                onSelectService={handleSelectSearchService}
                onSelectWorker={handleSelectSearchWorker}
                onSelectRecent={handleSelectRecentSearch}
                onClearRecent={clearRecentSearches}
              />
            </View>
          )}
        </LinearGradient>

        {/* Categories */}
        <View style={styles.categoriesGrid}>
          {categories.map((category) => {
            const meta = categoryMeta(category.key, category);
            return (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryClick(category)}
                activeOpacity={0.85}
              >
                <View style={[styles.categoryIcon, { backgroundColor: meta.bg }]}>
                  <CategoryIcon meta={meta} size={scale(30)} />
                </View>
                <Text style={styles.categoryTitle} numberOfLines={1} adjustsFontSizeToFit>
                  {category.name}
                </Text>
                <Text style={styles.categoryCount}>
                  {category.technicianCount ?? 0} pros
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Urgence banner */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#1f63f2', NAVY]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.urgenceBanner}
          >
            <Image source={require('../assets/fixpro-worker.png')} style={styles.urgenceImage} />
            <LinearGradient
              colors={['#1d5ff0', 'rgba(23,82,224,0.85)', 'rgba(15,63,179,0)']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.urgenceFade}
            />
            <View style={styles.urgenceContent}>
              <View style={styles.urgenceTag}>
                <Ionicons name="flash" size={13} color="#fff" />
                <Text style={styles.urgenceTagText}>URGENCE</Text>
              </View>
              <Text style={styles.urgenceTitle}>
                Un problème <Text style={{ color: ACCENT }}>urgent ?</Text>
              </Text>
              <Text style={styles.urgenceSubtitle}>
                Des professionnels disponibles près de chez vous.
              </Text>
              <TouchableOpacity style={styles.urgenceButton} onPress={handleSeeAllProfessionals} activeOpacity={0.85}>
                <Text style={styles.urgenceButtonText}>Demander maintenant</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.timerBadge}>
              <Ionicons name="stopwatch-outline" size={14} color={Colors.primary} style={styles.timerIcon} />
              <Text style={styles.timerValue}>30</Text>
              <Text style={styles.timerUnit}>min</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Nearby technicians */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Techniciens proches de vous</Text>
          <TouchableOpacity style={styles.seeAll} onPress={handleSeeAllProfessionals}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.workersRow}
          snapToInterval={styles.workerCard.width + scale(12)}
          decelerationRate="fast"
        >
          {workers.map((worker) => {
            const avatar = worker.user?.avatar || worker.avatar;
            const distance = formatDistance(worker.distanceKm);
            const isFavorite = favorites.includes(worker.id);
            return (
              <TouchableOpacity
                key={worker.id}
                style={styles.workerCard}
                onPress={() => handleWorkerClick(worker)}
                activeOpacity={0.9}
              >
                <View style={styles.workerTop}>
                  <View style={styles.avatarWrap}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>{worker.name[0]?.toUpperCase()}</Text>
                      </View>
                    )}
                    {worker.isActive && <View style={styles.onlineDot} />}
                  </View>
                  <View style={styles.workerInfo}>
                    <View style={styles.workerNameRow}>
                      <Text style={styles.workerName} numberOfLines={1}>{shortName(worker.name)}</Text>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(worker.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={19} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="star" size={13} color={Colors.star} />
                      <Text style={styles.metaText}>
                        {Number(worker.averageRating).toFixed(1)} ({worker.totalReviews})
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={[styles.statusDot, { backgroundColor: worker.isActive ? '#16a34a' : '#9ca3af' }]} />
                      <Text style={[styles.metaText, { color: worker.isActive ? '#16a34a' : '#9ca3af' }]}>
                        {worker.isActive ? 'Disponible' : 'Indisponible'}
                      </Text>
                    </View>
                    {!!distance && (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={13} color="#6b7280" />
                        <Text style={styles.metaText}>{distance}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.reserveButton} onPress={() => handleReservePress(worker)} activeOpacity={0.85}>
                  <Text style={styles.reserveButtonText}>Réserver</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          {workers.length === 0 && (
            <Text style={styles.emptyText}>Aucun technicien disponible pour le moment.</Text>
          )}
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const createStyles = (width, insets) => {
  const gutter = wp(5);
  const cardWidth = (width - gutter * 2 - scale(12)) / 2;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f4f7fc',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: scale(36),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f4f7fc',
    },

    // Header
    header: {
      paddingTop: scale(8),
      paddingHorizontal: gutter,
      paddingBottom: scale(26),
      borderBottomLeftRadius: scale(30),
      borderBottomRightRadius: scale(30),
      overflow: 'hidden',
    },
    headerGlow: {
      position: 'absolute',
      right: -scale(80),
      bottom: -scale(120),
      width: scale(300),
      height: scale(300),
      borderRadius: scale(150),
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(18),
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(4),
      flexShrink: 1,
    },
    brandLogo: {
      width: scale(50),
      height: scale(50),
      marginLeft: -scale(8),
    },
    brandName: {
      fontSize: rf(30),
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.5,
      lineHeight: rf(32),
    },
    brandTagline: {
      fontSize: rf(10.5),
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
    },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
      maxWidth: scale(140),
      paddingHorizontal: scale(12),
      paddingVertical: scale(10),
      borderRadius: scale(22),
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    locationText: {
      color: '#fff',
      fontSize: rf(13),
      fontWeight: '600',
      flexShrink: 1,
    },
    bellButton: {
      padding: scale(4),
    },
    bellBadge: {
      position: 'absolute',
      top: scale(3),
      right: scale(4),
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
      backgroundColor: '#ef4444',
      borderWidth: 1.5,
      borderColor: NAVY,
    },
    greeting: {
      fontSize: rf(19),
      color: '#fff',
      fontWeight: '500',
      marginBottom: scale(4),
    },
    heroTitle: {
      fontSize: rf(31),
      lineHeight: rf(38),
      color: '#fff',
      fontWeight: '800',
      letterSpacing: -0.5,
      marginBottom: scale(20),
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: scale(18),
      paddingLeft: scale(16),
      paddingRight: scale(7),
      height: scale(60),
      gap: scale(10),
      shadowColor: '#0b2a6b',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: rf(15.5),
      color: Colors.text,
      paddingVertical: 0,
    },
    clearButton: {
      padding: scale(2),
    },
    filterButton: {
      width: scale(46),
      height: scale(46),
      borderRadius: scale(14),
      backgroundColor: '#1d5ff0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchOverlayWrap: {
      marginTop: scale(16),
      marginHorizontal: -scale(20),
    },

    // Categories
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: gutter,
      marginTop: scale(20),
      gap: scale(10),
    },
    categoryCard: {
      width: (width - gutter * 2 - scale(30)) / 4,
      backgroundColor: '#fff',
      borderRadius: scale(18),
      paddingTop: scale(8),
      paddingBottom: scale(10),
      paddingHorizontal: scale(6),
      alignItems: 'center',
      shadowColor: '#1e3a8a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 2,
    },
    categoryIcon: {
      width: '100%',
      aspectRatio: 1.35,
      borderRadius: scale(14),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(8),
    },
    categoryTitle: {
      fontSize: rf(12.5),
      fontWeight: '700',
      color: Colors.text,
      textAlign: 'center',
    },
    categoryCount: {
      fontSize: rf(11.5),
      color: '#6b7280',
      marginTop: scale(2),
    },

    // Urgence banner
    section: {
      paddingHorizontal: gutter,
      marginTop: scale(22),
    },
    urgenceBanner: {
      borderRadius: scale(22),
      overflow: 'hidden',
      minHeight: scale(200),
      justifyContent: 'center',
    },
    urgenceImage: {
      position: 'absolute',
      right: -scale(70),
      top: 0,
      bottom: 0,
      width: scale(300),
      height: '100%',
      resizeMode: 'cover',
    },
    urgenceFade: {
      ...StyleSheet.absoluteFillObject,
      right: scale(90),
    },
    urgenceContent: {
      padding: scale(20),
      width: '74%',
    },
    urgenceTag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: scale(4),
      backgroundColor: '#f97316',
      paddingHorizontal: scale(12),
      paddingVertical: scale(5),
      borderRadius: scale(14),
      marginBottom: scale(10),
    },
    urgenceTagText: {
      color: '#fff',
      fontSize: rf(12),
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    urgenceTitle: {
      fontSize: rf(21),
      fontWeight: '800',
      color: '#fff',
      marginBottom: scale(6),
    },
    urgenceSubtitle: {
      fontSize: rf(14),
      lineHeight: rf(19),
      color: 'rgba(255,255,255,0.92)',
      marginBottom: scale(14),
    },
    urgenceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: scale(8),
      backgroundColor: '#fff',
      borderRadius: scale(24),
      paddingVertical: scale(11),
      paddingHorizontal: scale(18),
    },
    urgenceButtonText: {
      color: Colors.primary,
      fontSize: rf(14.5),
      fontWeight: '700',
    },
    timerBadge: {
      position: 'absolute',
      right: scale(14),
      bottom: scale(14),
      width: scale(58),
      height: scale(58),
      borderRadius: scale(29),
      backgroundColor: '#fff',
      borderWidth: 3,
      borderColor: '#1d5ff0',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    timerIcon: {
      position: 'absolute',
      top: -scale(9),
      backgroundColor: '#fff',
      borderRadius: scale(8),
    },
    timerValue: {
      fontSize: rf(20),
      fontWeight: '800',
      color: NAVY,
      lineHeight: rf(22),
    },
    timerUnit: {
      fontSize: rf(10),
      fontWeight: '700',
      color: NAVY,
      marginTop: -scale(2),
    },

    // Nearby technicians
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: gutter,
      marginTop: scale(26),
      marginBottom: scale(12),
    },
    sectionTitle: {
      fontSize: rf(19),
      fontWeight: '800',
      color: Colors.text,
      flexShrink: 1,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(2),
    },
    seeAllText: {
      fontSize: rf(14.5),
      fontWeight: '600',
      color: Colors.primary,
    },
    workersRow: {
      paddingHorizontal: gutter,
      gap: scale(12),
      paddingBottom: scale(6),
    },
    workerCard: {
      width: cardWidth,
      backgroundColor: '#fff',
      borderRadius: scale(18),
      padding: scale(10),
      shadowColor: '#1e3a8a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    workerTop: {
      flexDirection: 'row',
      gap: scale(8),
      marginBottom: scale(10),
    },
    avatarWrap: {
      width: scale(50),
      height: scale(50),
    },
    avatar: {
      width: scale(50),
      height: scale(50),
      borderRadius: scale(25),
      backgroundColor: '#e8effd',
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: rf(22),
      fontWeight: '700',
      color: Colors.primary,
    },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: scale(2),
      width: scale(15),
      height: scale(15),
      borderRadius: scale(8),
      backgroundColor: '#16a34a',
      borderWidth: 2.5,
      borderColor: '#fff',
    },
    workerInfo: {
      flex: 1,
      gap: scale(3),
    },
    workerNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scale(4),
    },
    workerName: {
      fontSize: rf(14.5),
      fontWeight: '700',
      color: Colors.text,
      flexShrink: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(4),
    },
    metaText: {
      fontSize: rf(12),
      color: '#4b5563',
      fontWeight: '500',
    },
    statusDot: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
    },
    reserveButton: {
      backgroundColor: '#1d5ff0',
      borderRadius: scale(20),
      paddingVertical: scale(9),
      alignItems: 'center',
    },
    reserveButtonText: {
      color: '#fff',
      fontSize: rf(14),
      fontWeight: '700',
    },
    emptyText: {
      color: '#6b7280',
      fontSize: rf(13),
      paddingVertical: scale(20),
    },
  });
};

export default UserHomePage;
