import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import { Colors } from '../styles/theme';
import { getCurrentCoords } from '../utils/location';

const ProfessionalsPage = ({ navigation }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  useEffect(() => {
    getCurrentCoords().then(setCoords);
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 100, minRating: 0 };
      if (coords) {
        params.lat = coords.latitude;
        params.lng = coords.longitude;
      }
      const response = await apiService.getWorkers(params);
      const rawWorkers = response.data?.workers || response.workers || response.data || response || [];
      setWorkers(Array.isArray(rawWorkers) ? rawWorkers : []);
    } catch (error) {
      console.error('Failed to load professionals:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const filteredWorkers = workers
    .filter((worker) => {
      const name = worker.user?.name || worker.name || '';
      const profession = worker.services?.[0]?.name || worker.profession || '';
      const term = searchTerm.toLowerCase();
      return name.toLowerCase().includes(term) || profession.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (!sortByDistance) return 0;
      const aDist = typeof a.distanceKm === 'number' ? a.distanceKm : Infinity;
      const bDist = typeof b.distanceKm === 'number' ? b.distanceKm : Infinity;
      return aDist - bDist;
    });

  const goToWorkerProfile = (worker) => {
    navigation.navigate('WorkerProfile', { workerId: worker.id || worker.userId || worker._id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tous les professionnels</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un professionnel..."
            placeholderTextColor={Colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>
            {filteredWorkers.length} professionnel{filteredWorkers.length > 1 ? 's' : ''} trouvé
            {filteredWorkers.length > 1 ? 's' : ''}
          </Text>
          {coords && (
            <TouchableOpacity
              style={[styles.nearestChip, sortByDistance && styles.nearestChipActive]}
              onPress={() => setSortByDistance(!sortByDistance)}
            >
              <Ionicons
                name="locate"
                size={13}
                color={sortByDistance ? Colors.textLight : Colors.primary}
              />
              <Text style={[styles.nearestChipText, sortByDistance && styles.nearestChipTextActive]}>
                Plus proches
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredWorkers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={54} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun professionnel trouvé</Text>
          </View>
        ) : (
          filteredWorkers.map((worker) => (
            <TouchableOpacity
              key={worker.id || worker.userId || worker._id}
              style={styles.card}
              onPress={() => goToWorkerProfile(worker)}
            >
              <View style={styles.avatar}>
                {worker.user?.avatar || worker.avatar ? (
                  <Image
                    source={{ uri: worker.user?.avatar || worker.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {(worker.user?.name || worker.name || 'W')?.[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.name}>{worker.user?.name || worker.name || 'Technicien'}</Text>
                <Text style={styles.profession}>
                  {worker.services?.[0]?.name || worker.profession || 'Professionnel'}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={14} color={Colors.star} />
                  <Text style={styles.metaText}>
                    {worker.averageRating || 0} ({worker.totalReviews || 0} avis)
                  </Text>
                  {typeof worker.distanceKm === 'number' && (
                    <>
                      <Text style={styles.metaText}> · </Text>
                      <Ionicons name="location" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {' '}
                        {worker.distanceKm < 1
                          ? `${Math.round(worker.distanceKm * 1000)} m`
                          : `${worker.distanceKm} km`}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 24,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginTop: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  resultRow: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultCount: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  nearestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nearestChipActive: {
    backgroundColor: Colors.primary,
  },
  nearestChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  nearestChipTextActive: {
    color: Colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  profession: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});

export default ProfessionalsPage;
