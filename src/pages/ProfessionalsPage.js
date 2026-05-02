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

const ProfessionalsPage = ({ navigation }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getWorkers({ limit: 100, minRating: 0 });
      const rawWorkers = response.data?.workers || response.workers || response.data || response || [];
      setWorkers(Array.isArray(rawWorkers) ? rawWorkers : []);
    } catch (error) {
      console.error('Failed to load professionals:', error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkers();
    setRefreshing(false);
  };

  const filteredWorkers = workers.filter((worker) => {
    const name = worker.user?.name || worker.name || '';
    const profession = worker.services?.[0]?.name || worker.profession || '';
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || profession.toLowerCase().includes(term);
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

        <Text style={styles.resultCount}>
          {filteredWorkers.length} professionnel{filteredWorkers.length > 1 ? 's' : ''} trouvé
          {filteredWorkers.length > 1 ? 's' : ''}
        </Text>

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
  resultCount: {
    marginTop: 12,
    marginBottom: 8,
    color: Colors.textSecondary,
    fontSize: 13,
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
