import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../styles/theme';
import { useNotifications } from '../context/NotificationContext';

const ReservationsPage = ({ navigation }) => {
  const { resetReservationUnread } = useNotifications();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadReservations();
  }, []);

  // Reset reservation badge when entering this tab
  useFocusEffect(
    React.useCallback(() => {
      resetReservationUnread();
    }, [resetReservationUnread])
  );

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUserReservations();
      setReservations(data.data?.reservations || data.reservations || data.data || data);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      Alert.alert('Erreur', 'Impossible de charger vos réservations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const getStatusConfig = (status) => {
    const statusLower = status?.toLowerCase() || 'pending';
    const configs = {
      pending: { color: '#eab308', bg: '#fef9c3', text: 'En attente', icon: 'time' },
      accepted: { color: '#3b82f6', bg: '#dbeafe', text: 'Accepté', icon: 'checkmark-circle' },
      in_progress: { color: '#8b5cf6', bg: '#ede9fe', text: 'En cours', icon: 'sync-outline' },
      completed: { color: '#22c55e', bg: '#dcfce7', text: 'Terminé', icon: 'checkmark-done-circle' },
      cancelled: { color: '#ef4444', bg: '#fee2e2', text: 'Annulé', icon: 'close-circle' },
      rejected: { color: '#ef4444', bg: '#fee2e2', text: 'Refusé', icon: 'close-circle' },
    };
    return configs[statusLower] || configs.pending;
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (filter === 'all') return true;
    const statusLower = (reservation.status || '').toLowerCase();
    return statusLower === filter.toLowerCase();
  });

  const handleViewDetails = (reservation) => {
    navigation.navigate('OrderTracking', { reservationId: reservation.id });
  };

  const handleRateWorker = (reservation) => {
    navigation.navigate('Rating', {
      reservationId: reservation.id,
      workerId: reservation.workerId,
      workerName: reservation.workerName || reservation.worker?.name || 'technicien',
    });
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === 'pending' || r.status === 'PENDING').length,
    in_progress: reservations.filter((r) => r.status === 'in_progress' || r.status === 'IN_PROGRESS').length,
    completed: reservations.filter((r) => r.status === 'completed' || r.status === 'COMPLETED').length,
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < fullStars ? 'star' : 'star-outline'}
          size={12}
          color={Colors.star}
        />
      );
    }
    return stars;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes réservations</Text>
      </View>

      {/* Stats Section - floats over header */}
      <View style={styles.statsBackground}>
        <View style={styles.statsContainer}>
          {[
            { value: stats.total, label: 'Total', icon: 'calendar', color: Colors.primary },
            { value: stats.pending, label: 'En attente', icon: 'time', color: '#eab308' },
            { value: stats.in_progress, label: 'En cours', icon: 'sync-outline', color: '#8b5cf6' },
            { value: stats.completed, label: 'Terminées', icon: 'checkmark-done-circle', color: '#22c55e' },
          ].map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Filter */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'Toutes', icon: 'list-outline' },
              { key: 'pending', label: 'En attente', icon: 'time-outline' },
              { key: 'in_progress', label: 'En cours', icon: 'sync-outline' },
              { key: 'completed', label: 'Terminées', icon: 'checkmark-circle-outline' },
              { key: 'cancelled', label: 'Annulées', icon: 'close-circle-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterChip,
                  filter === item.key && styles.activeFilterChip,
                ]}
                onPress={() => setFilter(item.key)}
              >
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={filter === item.key ? Colors.textLight : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    filter === item.key && styles.activeFilterChipText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section Title */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filter === 'all' ? 'Toutes les réservations' :
               filter === 'pending' ? 'Réservations en attente' :
               filter === 'in_progress' ? 'Réservations en cours' :
               filter === 'completed' ? 'Réservations terminées' : 'Réservations annulées'}
            </Text>
            <Text style={styles.sectionCount}>{filteredReservations.length}</Text>
          </View>
        </View>

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={64} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune réservation</Text>
            <Text style={styles.emptySubtitle}>
              Vous n'avez pas encore de réservation dans cette catégorie
            </Text>
          </View>
        ) : (
          filteredReservations.map((reservation) => {
            const statusConfig = getStatusConfig(reservation.status);

            return (
              <View key={reservation.id} style={styles.reservationCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.workerRow}>
                    <View style={styles.workerAvatar}>
                      {reservation.worker?.avatar || reservation.workerAvatar ? (
                        <Image
                          source={{ uri: reservation.worker?.avatar || reservation.workerAvatar }}
                          style={styles.workerAvatarImage}
                        />
                      ) : (
                        <Text style={styles.workerAvatarInitial}>
                          {(reservation.workerName || reservation.worker?.name || 'W')?.[0]?.toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{reservation.workerName}</Text>
                      <View style={styles.workerRatingRow}>
                        <View style={styles.starsRow}>
                          {renderStars(reservation.workerRating)}
                        </View>
                        <Text style={styles.ratingValue}>
                          {reservation.workerRating || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.text}
                    </Text>
                  </View>
                </View>

                {/* Service Name */}
                <View style={styles.serviceRow}>
                  <Ionicons name="construct-outline" size={16} color={Colors.primary} />
                  <Text style={styles.serviceText}>
                    {reservation.service?.name || reservation.service || 'Service'}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {new Date(reservation.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>{reservation.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {reservation.address || 'Adresse non spécifiée'}
                    </Text>
                  </View>
                  {reservation.workerPhone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>{reservation.workerPhone}</Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                {reservation.description && (
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {reservation.description}
                    </Text>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleViewDetails(reservation)}
                  >
                    <Ionicons name="eye-outline" size={18} color={Colors.textLight} />
                    <Text style={styles.viewButtonText}>Voir détails</Text>
                  </TouchableOpacity>

                  {(reservation.status === 'accepted' || reservation.status === 'ACCEPTED' || 
                    reservation.status === 'in_progress' || reservation.status === 'IN_PROGRESS') && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => navigation.navigate('Messages', { conversationId: reservation.id })}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color={Colors.textLight} />
                      <Text style={styles.contactButtonText}>Contacter</Text>
                    </TouchableOpacity>
                  )}

                  {(reservation.status === 'completed' || reservation.status === 'COMPLETED') && !reservation.userRating && (
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => handleRateWorker(reservation)}
                    >
                      <Ionicons name="star" size={18} color={Colors.textLight} />
                      <Text style={styles.rateButtonText}>Évaluer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Bottom spacing */}
        <View style={{ height: 24 }} />
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

  // Header - matches WorkerProfile
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },

  // Stats - floating card like WorkerProfile detailsCard
  statsBackground: {
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Filter - styled like WorkerProfile
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.card,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: Colors.textLight,
    fontWeight: '600',
  },

  // Section - matches WorkerProfile
  section: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Empty state
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Reservation Card - matches WorkerProfile cards
  reservationCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  workerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  workerAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  workerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Service
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  serviceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Details
  detailsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Description
  descriptionBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  descriptionText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },

  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },

// Actions - matches WorkerProfile button style
cardActions: {
  flexDirection: 'row',
  gap: 10,
},
viewButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.primary,
  paddingVertical: 12,
  borderRadius: 12,
  gap: 6,
  shadowColor: Colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
viewButtonText: {
  color: Colors.textLight,
  fontSize: 14,
  fontWeight: '600',
},
contactButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.secondary || '#8b5cf6',
  paddingVertical: 12,
  borderRadius: 12,
  gap: 6,
  shadowColor: Colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
contactButtonText: {
  color: Colors.textLight,
  fontSize: 14,
  fontWeight: '600',
},
rateButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.success,
  paddingVertical: 12,
  borderRadius: 12,
  gap: 6,
  shadowColor: Colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
rateButtonText: {
  color: Colors.textLight,
  fontSize: 14,
  fontWeight: '600',
},
});

export default ReservationsPage;