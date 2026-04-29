import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { useResponsive, wp, hp, rf, scale, getNumColumns } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (width, height, isTablet, isSmallPhone, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: insets.top + hp(2),
    paddingBottom: hp(2),
    backgroundColor: Colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: wp(1),
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: wp(3),
  },
  categoryIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: "#fff",
  },
  headerSpacer: {
    width: scale(32),
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: scale(12),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: wp(2),
  },
  searchInput: {
    flex: 1,
    fontSize: rf(14),
    color: Colors.text,
  },
  filtersContainer: {
    backgroundColor: Colors.card,
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    padding: wp(4),
    borderRadius: scale(12),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    marginBottom: hp(1.5),
  },
  filterLabel: {
    fontSize: rf(13),
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: hp(1),
  },
  filterChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: scale(20),
    backgroundColor: Colors.input,
    marginRight: wp(2),
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: rf(13),
    color: Colors.textSecondary,
  },
  activeFilterChipText: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  availableFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  checkbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(4),
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: wp(2),
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  availableText: {
    fontSize: rf(13),
    color: Colors.text,
  },
  resultCount: {
    fontSize: rf(11),
    color: Colors.textTertiary,
  },
  emptyContainer: {
    padding: wp(12),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: Colors.text,
    marginTop: hp(2),
  },
  emptySubtext: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    marginTop: hp(1),
  },
  workerCard: {
    backgroundColor: Colors.card,
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderRadius: scale(12),
    padding: wp(4),
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  workerAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: rf(15),
    fontWeight: '600',
    color: Colors.text,
    marginBottom: hp(0.5),
  },
  workerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: wp(1.5),
  },
  statusText: {
    fontSize: rf(11),
    color: Colors.textSecondary,
  },
  workerBio: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    marginBottom: hp(1.5),
    lineHeight: rf(18),
  },
  workerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  ratingText: {
    marginLeft: wp(1),
    fontSize: rf(13),
    color: Colors.text,
  },
  workerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: hp(1.5),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(4),
    marginBottom: hp(1),
  },
  detailText: {
    fontSize: rf(13),
    color: Colors.textSecondary,
    marginLeft: wp(1),
  },
  rateText: {
    fontSize: rf(13),
    color: Colors.primary,
    fontWeight: '600',
  },
  workerActions: {
    flexDirection: 'row',
    gap: wp(2),
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: Colors.input,
    paddingVertical: hp(1.5),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  viewProfileButtonText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: Colors.text,
  },
  bookButton: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: Colors.textLight,
  },
});

const ServiceWorkersPage = ({ route, navigation }) => {
  const { category } = route.params || {};
  const { width, height, isTablet, isSmallPhone } = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = createStyles(width, height, isTablet, isSmallPhone, insets);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [filterAvailable, setFilterAvailable] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, [category, filterAvailable]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const params = {
        category: category,
        minRating: 0,
        limit: 50
      };
      
      if (filterAvailable) {
        params.isActive = true;
      }
      
      const data = await apiService.getWorkers(params);
      setWorkers(data.data?.workers || data.workers || data.data || data);
    } catch (error) {
      console.error('Failed to load workers:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const getCategoryInfo = () => {
    const categories = {
      plumbing: {
        title: 'Plomberie',
        icon: 'construct',
        color: Colors.primary,
        description: 'Plombiers professionnels disponibles'
      },
      electrical: {
        title: 'Électricité',
        icon: 'flash',
        color: Colors.primary,
        description: 'Électriciens certifiés à votre service'
      },
      hvac: {
        title: 'Climatisation',
        icon: 'snow',
        color: Colors.primary,
        description: 'Techniciens HVAC expérimentés'
      },
      locksmith: {
        title: 'Serrurerie',
        icon: 'lock-closed',
        color: Colors.primary,
        description: 'Serruriers disponibles 24/7'
      }
    };
    return categories[category] || categories.plumbing;
  };

  const categoryInfo = getCategoryInfo();

  const filteredWorkers = workers
    .filter(worker => {
      const matchesSearch = worker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          worker.bio?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAvailability = !filterAvailable || worker.isActive;
      return matchesSearch && matchesAvailability;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'experience') return (b.experience || 0) - (a.experience || 0);
      if (sortBy === 'jobs') return (b.jobsCompleted || 0) - (a.jobsCompleted || 0);
      return 0;
    });

  const handleWorkerClick = (workerId) => {
    navigation.navigate('WorkerProfile', { workerId });
  };

  const handleReservationClick = (workerId) => {
    navigation.navigate('ReservationDetails', { workerId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.card} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color }]}>
            <Ionicons name={categoryInfo.icon} size={20} color={Colors.textLight} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{categoryInfo.title}</Text>
            <Text style={styles.headerSubtitle}>{categoryInfo.description}</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un professionnel..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Trier par:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { value: 'rating', label: 'Note' },
                { value: 'experience', label: 'Expérience' },
                { value: 'jobs', label: 'Jobs' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    sortBy === option.value && styles.activeFilterChip
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={[
                    styles.filterChipText,
                    sortBy === option.value && styles.activeFilterChipText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <TouchableOpacity
            style={styles.availableFilter}
            onPress={() => setFilterAvailable(!filterAvailable)}
          >
            <View style={[styles.checkbox, filterAvailable && styles.checkboxChecked]} />
            <Text style={styles.availableText}>Uniquement les disponibles</Text>
          </TouchableOpacity>
          
          <Text style={styles.resultCount}>
            {filteredWorkers.length} professionnel{filteredWorkers.length > 1 ? 's' : ''} trouvé{filteredWorkers.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Workers List */}
        {filteredWorkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun professionnel trouvé</Text>
            <Text style={styles.emptySubtext}>
              Essayez de modifier vos filtres ou votre recherche
            </Text>
          </View>
        ) : (
          filteredWorkers.map(worker => (
            <View key={worker.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <View style={styles.workerAvatar}>
                  <Ionicons name="person" size={28} color="#667eea" />
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <View style={styles.workerStatus}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: worker.isActive ? '#22c55e' : '#9ca3af' }
                    ]} />
                    <Text style={styles.statusText}>
                      {worker.isActive ? 'Disponible' : 'Indisponible'}
                    </Text>
                  </View>
                </View>
                {worker.isVerified && (
                  <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                )}
              </View>
              
              {worker.bio && (
                <Text style={styles.workerBio} numberOfLines={2}>
                  {worker.bio}
                </Text>
              )}
              
              <View style={styles.workerRating}>
                <Ionicons name="star" size={16} color="#eab308" />
                <Text style={styles.ratingText}>
                  {worker.averageRating || 'N/A'} ({worker.totalReviews || 0} avis)
                </Text>
              </View>
              
              <View style={styles.workerDetails}>
                {worker.experience && (
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={16} color="#666" />
                    <Text style={styles.detailText}>{worker.experience} ans</Text>
                  </View>
                )}
                {worker.jobsCompleted && (
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#666" />
                    <Text style={styles.detailText}>{worker.jobsCompleted} jobs</Text>
                  </View>
                )}
                {worker.hourlyRate && (
                  <View style={styles.detailItem}>
                    <Text style={styles.rateText}>{worker.hourlyRate}$/h</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.workerActions}>
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => handleWorkerClick(worker.id)}
                >
                  <Text style={styles.viewProfileButtonText}>Voir profil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bookButton, { backgroundColor: categoryInfo.color }]}
                  onPress={() => handleReservationClick(worker.id)}
                >
                  <Text style={styles.bookButtonText}>Réserver</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ServiceWorkersPage;
