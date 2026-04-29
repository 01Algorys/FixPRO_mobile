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
import apiService from '../services/api';
import socketService from '../services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { useResponsive, wp, hp, rf, scale, getNumColumns } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UserHomePage = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { width, height, isTablet, isSmallPhone, getSpacing } = useResponsive();
  const insets = useSafeAreaInsets();
  const numColumns = getNumColumns();
  const styles = createStyles(width, height, isTablet, isSmallPhone, insets);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();

    // Listen for navigation to review page
    socketService.on('navigate_to_review', (data) => {
      navigation.navigate('Rating', {
        reservationId: data.reservationId,
        workerId: data.workerId
      });
    });

    // Cleanup on unmount
    return () => {
      socketService.off('navigate_to_review');
    };
  }, []);

  const loadUserData = async () => {
    try {
      const profileResponse = await apiService.getUserProfile();
      const profileData = profileResponse.data || profileResponse;
      setUserData(profileData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Fallback to auth context user data
      setUserData(user);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, topWorkersData, userProfile] = await Promise.all([
        apiService.getServices(),
        apiService.getWorkers({ limit: 4, minRating: 4.0 }),
        apiService.getUserProfile().catch(() => null)
      ]);
      
      setServices(servicesData.data || servicesData);
      
      // Debug: Log the API response structure
      console.log('Top Workers API Response:', JSON.stringify(topWorkersData, null, 2));
      
      // Process workers data to ensure proper structure
      const workersData = topWorkersData.data?.workers || topWorkersData.workers || topWorkersData.data || topWorkersData || [];
      console.log('Workers Data Array:', JSON.stringify(workersData, null, 2));
      const processedWorkers = workersData.map(worker => {
        console.log('Processing worker:', JSON.stringify(worker, null, 2));
        return {
          ...worker,
          name: worker.user?.name || worker.name || worker.firstName && worker.lastName ? `${worker.firstName} ${worker.lastName}` : worker.fullName || worker.username || 'Technicien',
          profession: worker.services?.[0]?.name || worker.profession || worker.specialty || worker.service || worker.category || 'Professionnel',
          averageRating: worker.averageRating || worker.rating || 0,
          totalReviews: worker.totalReviews || worker.reviewCount || 0,
          experience: worker.experience || 0,
          basePrice: worker.hourlyRate || worker.basePrice || 30,
          isVerified: worker.isVerified || worker.verified || false,
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
      Alert.alert('Erreur', 'Impossible de charger les données');
      // Fallback to auth context user data
      setUserData(user);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleWorkerClick = (worker) => {
    console.log(worker.id)
    navigation.navigate('WorkerProfile', { workerId: worker.id });
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

  const handleReservationClick = (categoryId) => {
    navigation.navigate('ServiceWorkers', { category: categoryId });
  };

  const handleSeeAllProfessionals = () => {
    navigation.navigate('Professionals');
  };

  const categories = [
    {
      id: 'plumbing',
      title: 'Plomberie',
      subtitle: 'Réparation et installation',
      description: 'Services complets de plomberie',
      availability: '24/7',
      icon: 'construct',
      color: '#3b82f6',
    },
    {
      id: 'electrical',
      title: 'Électricité',
      subtitle: 'Services électriques',
      description: 'Électriciens certifiés',
      availability: 'Lun-Sam 8h-20h',
      icon: 'flash',
      color: '#eab308',
    },
    {
      id: 'hvac',
      title: 'Climatisation',
      subtitle: 'Installation HVAC',
      description: 'Techniciens HVAC expérimentés',
      availability: 'Lun-Dim 7h-22h',
      icon: 'snow',
      color: '#22c55e',
    },
    {
      id: 'locksmith',
      title: 'Serrurerie',
      subtitle: 'Dépannage serrures',
      description: 'Serruriers disponibles 24/7',
      availability: '24/7',
      icon: 'lock-closed',
      color: '#ef4444',
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
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
            </TouchableOpacity>
          </View>
        <Text style={styles.welcomeText}>
          Bonjour {userData?.name || user?.name || ''}, Comment pouvons-nous vous aider?
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
            <Ionicons name="filter" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.categoriesGrid}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryClick(category.id)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name={category.icon} size={35} color={Colors.primary} />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
          >
            <View style={styles.workerHeader}>
              <View style={styles.workerAvatar}>
                <Ionicons name="person" size={28} color={Colors.primary} />
                {worker.isVerified && (
                  <View style={styles.verifiedBadge} />
                )}
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{worker.user.name}</Text>
                <Text style={styles.workerProfession}>
                  {worker.services && worker.services[0] ? worker.services[0].name : 'Service non spécifié'}
                </Text>
              </View>
            </View>
            
            <View style={styles.workerRating}>
              <View style={styles.stars}>
                {renderStars(worker.averageRating)}
              </View>
              <Text style={styles.ratingText}>
                {worker.averageRating || 0} ({worker.totalReviews || 0} avis)
              </Text>
            </View>
            
            <View style={styles.workerDetails}>
              <Text style={styles.experienceText}>
                {worker.experience || 0} ans d'expérience
              </Text>
              <Text style={styles.priceText}>
                À partir de {worker.basePrice || 30} TND
              </Text>
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
    backgroundColor: Colors.headerBackground,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.headerBackground,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingHorizontal: wp(5),
    paddingTop: insets.top + hp(2),
    paddingBottom: hp(3),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2.5),
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
  welcomeText: {
    fontSize: rf(16),
    color: Colors.textLight,
    marginBottom: hp(2.5),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
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
    color: Colors.textLight,
  },
  seeAllText: {
    fontSize: rf(14),
    color: Colors.textLight,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
  },
  categoryCard: {
    width: isTablet ? '18%' : isSmallPhone ? '23%' : '22%',
    backgroundColor: Colors.card,
    borderRadius: scale(16),
    padding: wp(3),
    alignItems: 'center',
    marginBottom: hp(2),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  categoryTitle: {
    fontSize: rf(11),
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
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
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
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
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: rf(16),
    fontWeight: '600',
    color: Colors.text,
    marginBottom: hp(0.5),
  },
  workerProfession: {
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  stars: {
    flexDirection: 'row',
    marginRight: wp(2),
  },
  ratingText: {
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
  workerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experienceText: {
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
  priceText: {
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
});

export default UserHomePage;
