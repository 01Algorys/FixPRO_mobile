import React, { useState, useEffect } from 'react';
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
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import apiService from '../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../styles/theme';
import { useResponsive, wp, hp, rf, scale, getNumColumns } from '../utils/responsive';
import { getCurrentCoords, reverseGeocodeCity } from '../utils/location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  {
    id: 'plumbing',
    title: 'Plomberie',
    subtitle: 'Réparation et installation',
    description: 'Services complets de plomberie',
    availability: '24/7',
    icon: 'construct',
    iconLib: 'ionicons',
    color: '#1a56db',
  },
  {
    id: 'electrical',
    title: 'Électricité',
    subtitle: 'Services électriques',
    description: 'Électriciens certifiés',
    availability: 'Lun-Sam 8h-20h',
    icon: 'flash',
    iconLib: 'ionicons',
    color: '#eab308',
  },
  {
    id: 'hvac',
    title: 'Climatisation',
    subtitle: 'Installation HVAC',
    description: 'Techniciens HVAC expérimentés',
    availability: 'Lun-Dim 7h-22h',
    icon: 'snow',
    iconLib: 'ionicons',
    color: '#3b82f6',
  },
  {
    id: 'locksmith',
    title: 'Serrurerie',
    subtitle: 'Dépannage serrures',
    description: 'Serruriers disponibles 24/7',
    availability: '24/7',
    icon: 'lock-closed',
    iconLib: 'ionicons',
    color: '#8b5cf6',
  },
  {
    id: 'painting',
    title: 'Peinture',
    subtitle: 'Peinture intérieure et extérieure',
    description: 'Peintres professionnels',
    availability: 'Lun-Sam 8h-19h',
    icon: 'format-paint',
    iconLib: 'mci',
    color: '#ec4899',
  },
];

const UserHomePage = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { unreadMessages } = useNotifications();
  const { width, height, isTablet, isSmallPhone, getSpacing } = useResponsive();
  const insets = useSafeAreaInsets();
  const numColumns = getNumColumns();
  const styles = createStyles(width, height, isTablet, isSmallPhone, insets);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [userData, setUserData] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  useEffect(() => {
    loadUserLocation();
    loadData();
  }, []);

  const loadCategoryCounts = async () => {
    try {
      const results = await Promise.all(
        CATEGORIES.map((category) =>
          apiService
            .getWorkers({ category: category.id, limit: 1 })
            .catch(() => null)
        )
      );

      const counts = {};
      CATEGORIES.forEach((category, index) => {
        const response = results[index];
        const total = response?.data?.pagination?.total ?? response?.pagination?.total ?? 0;
        counts[category.id] = total;
      });
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Failed to load category counts:', error);
    }
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

  const handleLocatePress = () => {
    loadUserLocation();
  };

  const loadData = async (currentCoords = coords, { silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const workersParams = { limit: 4, minRating: 4.0 };
      if (currentCoords) {
        workersParams.lat = currentCoords.latitude;
        workersParams.lng = currentCoords.longitude;
        // Distance sorting takes priority over the rating filter so
        // the closest professionals aren't excluded from the list.
        delete workersParams.minRating;
      }

      const [servicesData, topWorkersData, userProfile] = await Promise.all([
        apiService.getServices(),
        apiService.getWorkers(workersParams),
        apiService.getUserProfile().catch(() => null)
      ]);

      setServices(servicesData.data || servicesData);
      loadCategoryCounts();

      // Process workers data to ensure proper structure
      const workersData = topWorkersData.data?.workers || topWorkersData.workers || topWorkersData.data || topWorkersData || [];
      const processedWorkers = workersData.map(worker => {
        return {
          ...worker,
          name: worker.user?.name || worker.name || worker.firstName && worker.lastName ? `${worker.firstName} ${worker.lastName}` : worker.fullName || worker.username || 'Technicien',
          profession: worker.services?.[0]?.name || worker.profession || worker.specialty || worker.service || worker.category || 'Professionnel',
          averageRating: worker.averageRating || worker.rating || 0,
          totalReviews: worker.totalReviews || worker.reviewCount || 0,
          experience: worker.experience || 0,
          basePrice: worker.hourlyRate || worker.basePrice || 30,
          isVerified: worker.isVerified || worker.verified || false,
          isActive: worker.isActive !== undefined ? worker.isActive : true,
          userId: worker.id || worker.userId || worker._id
        };
      });
      setWorkers(processedWorkers);

      // Set user data
      if (userProfile) {
        setUserData(userProfile.data || userProfile);
      } else {
        setUserData(user);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      if (!silent) Alert.alert('Erreur', 'Impossible de charger les données');
      // Fallback to auth context user data
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
    navigation.navigate('WorkerProfile', { workerId: worker.id });
  };

  const handleReservePress = (worker) => {
    navigation.navigate('ReservationDetails', { workerId: worker.id || worker.userId });
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : 'star-outline'}
          size={rf(14)}
          color={Colors.star}
        />
      );
    }
    return stars;
  };

  const handleCategoryClick = (categoryId) => {
    navigation.navigate('ServiceWorkers', { category: categoryId });
  };

  const handleSeeAllProfessionals = () => {
    navigation.navigate('Professionals');
  };

  const displayCityName = cityName
    || userData?.user?.location?.city
    || userData?.location?.city
    || 'Position non définie';
  const firstName = userData?.user?.name || user?.name || '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBackground} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>FixPro</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="notifications" size={24} color={Colors.textLight} />
              {unreadMessages > 0 && <View style={styles.notificationBadge} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.greetingText}>Bonjour {firstName} 👋</Text>
          <Text style={styles.welcomeText}>
            Comment pouvons-nous vous aider aujourd'hui ?
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un service..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="options-outline" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Location Bar */}
          <View style={styles.locationBar}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={16} color={Colors.primary} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Votre position</Text>
              <Text style={styles.locationValue} numberOfLines={1}>{displayCityName}</Text>
            </View>
            <TouchableOpacity style={styles.locationTargetButton} onPress={handleLocatePress} disabled={locatingUser}>
              {locatingUser ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="locate" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryClick(category.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                  {category.iconLib === 'mci' ? (
                    <MaterialCommunityIcons name={category.icon} size={30} color={category.color} />
                  ) : (
                    <Ionicons name={category.icon} size={30} color={category.color} />
                  )}
                </View>
                <Text style={styles.categoryTitle} numberOfLines={1}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>
                  {categoryCounts[category.id] ?? 0} pros
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Urgence Banner */}
        <View style={styles.section}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.urgenceBanner}
          >
            <View style={styles.urgenceLeft}>
              <View style={styles.urgenceTag}>
                <Ionicons name="flash" size={12} color={Colors.textLight} />
                <Text style={styles.urgenceTagText}>URGENCE</Text>
              </View>
              <Text style={styles.urgenceTitle}>
                Besoin d'une intervention urgente ?
              </Text>
              <Text style={styles.urgenceSubtitle}>
                Des professionnels certifiés à votre service, près de chez vous.
              </Text>
              <TouchableOpacity
                style={styles.urgenceButton}
                onPress={handleSeeAllProfessionals}
              >
                <Ionicons name="construct" size={16} color={Colors.primary} />
                <Text style={styles.urgenceButtonText}>Demander maintenant</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.urgenceRight}>
              <Image
                source={require('../assets/fixpro-worker.png')}
                style={styles.urgenceImage}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Workers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Techniciens certifiés</Text>
            <TouchableOpacity onPress={handleSeeAllProfessionals}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {workers.map(worker => (
            <TouchableOpacity
              key={worker.id || worker.userId}
              style={styles.workerCard}
              onPress={() => handleWorkerClick(worker)}
              activeOpacity={0.8}
            >
              <View style={styles.workerCardTop}>
                <View style={styles.workerAvatar}>
                  {worker.user?.avatar || worker.avatar ? (
                    <Image
                      source={{ uri: worker.user?.avatar || worker.avatar }}
                      style={styles.workerAvatarImage}
                    />
                  ) : (
                    <Text style={styles.workerAvatarInitial}>
                      {(worker.user?.name || worker.name || 'W')?.[0]?.toUpperCase()}
                    </Text>
                  )}
                  {worker.isActive && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.workerInfo}>
                  <View style={styles.workerNameRow}>
                    <Text style={styles.workerName} numberOfLines={1}>{worker.user?.name || worker.name}</Text>
                    {worker.isVerified && (
                      <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />
                    )}
                  </View>
                  <Text style={styles.workerProfession} numberOfLines={1}>
                    {worker.services && worker.services[0] ? worker.services[0].name : 'Service non spécifié'}
                  </Text>
                  <View style={styles.workerRating}>
                    <View style={styles.stars}>
                      {renderStars(worker.averageRating)}
                    </View>
                    <Text style={styles.ratingText}>
                      {worker.averageRating || 0} ({worker.totalReviews || 0} avis)
                    </Text>
                  </View>
                  <Text style={styles.experienceText}>
                    {worker.experience || 0} ans d'expérience
                  </Text>
                </View>
                {typeof worker.distanceKm === 'number' && (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="location" size={11} color={Colors.primary} />
                    <Text style={styles.distanceBadgeText}>
                      {worker.distanceKm < 1
                        ? `${Math.round(worker.distanceKm * 1000)} m`
                        : `${worker.distanceKm} km`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.workerCardBottom}>
                <View style={styles.workerStatus}>
                  <View style={[styles.statusDot, { backgroundColor: worker.isActive ? Colors.success : '#9ca3af' }]} />
                  <Text style={styles.statusText}>
                    {worker.isActive ? 'Disponible' : 'Indisponible'}
                  </Text>
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceLabel}>À partir de</Text>
                  <Text style={styles.priceText}>{worker.basePrice || 30} TND</Text>
                </View>
                
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Responsive styles using utility functions
const createStyles = (width, height, isTablet, isSmallPhone, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingHorizontal: wp(5),
    paddingTop: insets.top + hp(2),
    paddingBottom: hp(3),
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: rf(28),
    fontWeight: 'bold',
    color: Colors.textLight,
    textAlign: 'left',
  },
  notificationButton: {
    padding: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: wp(1.5),
    right: wp(1.5),
    width: scale(9),
    height: scale(9),
    borderRadius: scale(4.5),
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.headerBackground,
  },
  greetingText: {
    fontSize: rf(15),
    color: Colors.textLight,
    opacity: 0.9,
    marginBottom: hp(0.5),
  },
  welcomeText: {
    fontSize: rf(19),
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: hp(2.5),
    lineHeight: rf(25),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: scale(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    gap: wp(2.5),
  },
  searchInput: {
    padding: 2,
    height: hp(4),
    flex: 1,
    fontSize: rf(14),
    color: Colors.text,
  },
  filterButton: {
    backgroundColor: Colors.primaryDark,
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: scale(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    gap: wp(2.5),
  },
  locationIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: rf(11),
    color: Colors.textSecondary,
  },
  locationValue: {
    fontSize: rf(14),
    fontWeight: '700',
    color: Colors.text,
  },
  locationTargetButton: {
    padding: wp(1.5),
  },
  section: {
    paddingHorizontal: wp(4),
    marginBottom: hp(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: rf(14),
    color: Colors.primary,
    fontWeight: '600',
  },
  categoriesSection: {
    paddingHorizontal: wp(4),
    marginTop: hp(3),
    marginBottom: hp(3),
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: isTablet ? '18%' : '18.5%',
    backgroundColor: Colors.card,
    borderRadius: scale(18),
    paddingVertical: wp(3.5),
    paddingHorizontal: wp(1),
    alignItems: 'center',
    marginBottom: hp(2),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  categoryTitle: {
    fontSize: rf(11.5),
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  categorySubtitle: {
    fontSize: rf(9.5),
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: hp(0.3),
  },

  // Urgence banner
  urgenceBanner: {
    flexDirection: 'row',
    borderRadius: scale(20),
    padding: wp(4.5),
    overflow: 'hidden',
  },
  urgenceLeft: {
    flex: 1.4,
    paddingRight: wp(2),
  },
  urgenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: scale(20),
    gap: wp(1),
    marginBottom: hp(1.5),
  },
  urgenceTagText: {
    color: Colors.textLight,
    fontSize: rf(10),
    fontWeight: '700',
  },
  urgenceTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: hp(1),
    lineHeight: rf(23),
  },
  urgenceSubtitle: {
    fontSize: rf(12),
    color: Colors.textLight,
    opacity: 0.85,
    marginBottom: hp(2),
    lineHeight: rf(17),
  },
  urgenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    backgroundColor: Colors.card,
    borderRadius: scale(12),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3),
    alignSelf: 'flex-start',
  },
  urgenceButtonText: {
    color: Colors.primary,
    fontSize: rf(12.5),
    fontWeight: '700',
  },
  urgenceRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(1),
  },
  urgenceImage: {
    width: '100%',
    height: hp(25),
  },
  urgenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: scale(20),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.6),
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  urgenceBadgeText: {
    color: Colors.textLight,
    fontSize: rf(9),
    fontWeight: '600',
    flexShrink: 1,
  },

  // Worker cards
  workerCard: {
    backgroundColor: Colors.card,
    borderRadius: scale(16),
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: hp(1.5),
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: Colors.primary + '10',
    borderRadius: scale(10),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  distanceBadgeText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: Colors.primary,
  },
  workerAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  workerAvatarImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
  },
  workerAvatarInitial: {
    fontSize: scale(24),
    fontWeight: '700',
    color: Colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  workerInfo: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  workerName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
  },
  workerProfession: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    marginBottom: hp(0.5),
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  stars: {
    flexDirection: 'row',
    marginRight: wp(2),
  },
  ratingText: {
    fontSize: rf(12),
    color: Colors.textSecondary,
  },
  experienceText: {
    fontSize: rf(12),
    color: Colors.textTertiary,
  },
  workerCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: wp(2),
  },
  workerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  statusText: {
    fontSize: rf(12),
    color: Colors.textSecondary,
  },
  priceWrap: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: rf(10),
    color: Colors.textTertiary,
  },
  priceText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: Colors.text,
  },
  reserveButton: {
    backgroundColor: Colors.primary,
    borderRadius: scale(10),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
  },
  reserveButtonText: {
    color: Colors.textLight,
    fontSize: rf(12.5),
    fontWeight: '700',
  },
});

export default UserHomePage;
