import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import { Colors } from '../styles/theme';
import { responsiveStyles, responsive } from '../styles/responsiveStyles';
import { useNotifications } from '../context/NotificationContext';

const { width, height } = Dimensions.get('window');

const WorkerReservationsPage = ({ navigation }) => {
  const { resetReservationUnread } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState([]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      // Get worker profile first to obtain worker ID
      const workerProfile = await apiService.getWorkerProfile();
      const workerId = workerProfile.data?.userId || workerProfile.id;
      console.log('Worker ID:', workerId);
      
      if (workerId) {
        const response = await apiService.getWorkerReservations(workerId);
        console.log(response);
        const list = response.data?.reservations || response.reservations || response.data || response || [];
        setReservations(Array.isArray(list) ? list : []);
      } else {
        console.error('Worker ID not found in profile');
        setReservations([]);
      }
    } catch (error) {
      console.error('Failed to load worker reservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // Reset reservation badge when entering this tab
  useFocusEffect(
    React.useCallback(() => {
      resetReservationUnread();
    }, [resetReservationUnread])
  );

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

  const onUpdateStatus = async (reservationId, status) => {
    try {
      await apiService.updateReservationStatus(reservationId, status);
      
      // If accepting reservation, navigate to messages
      if (status === 'accepted') {
        navigation.navigate('Messages', { 
          conversationId: reservationId 
        });
      } else {
        await loadReservations();
      }
    } catch (error) {
      console.error('Failed to update reservation status:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour le statut de la réservation.");
    }
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
        <Text style={styles.headerTitle}>Demandes reçues</Text>
        <Text style={styles.headerSubtitle}>Gérez les nouvelles missions</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="clipboard-outline" size={64} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune demande</Text>
            <Text style={styles.emptySubtitle}>
              Vous n'avez pas encore de demandes de réservation
            </Text>
          </View>
        ) : (
          reservations.map((reservation) => {
            const statusConfig = getStatusConfig(reservation.status);
            
            return (
              <View key={reservation.id} style={styles.reservationCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.clientRow}>
                    <View style={styles.clientAvatar}>
                      {reservation.user?.avatar || reservation.userAvatar ? (
                        <Image
                          source={{ uri: reservation.user?.avatar || reservation.userAvatar }}
                          style={styles.clientAvatarImage}
                        />
                      ) : (
                        <Text style={styles.clientAvatarInitial}>
                          {(reservation.clientName || reservation.user?.name || 'C')?.[0]?.toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{reservation.clientName || reservation.user?.name || 'Client'}</Text>
                      <Text style={styles.serviceName}>{reservation.service?.name || reservation.service || 'Service'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.text}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }) : 'Date non spécifiée'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>{reservation.time || '--:--'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {reservation.address || 'Adresse non spécifiée'}
                    </Text>
                  </View>
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
                  {(reservation.status === 'pending' || reservation.status === 'PENDING') && (
                    <>
                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => onUpdateStatus(reservation.id, 'cancelled')}
                      >
                        <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                        <Text style={styles.declineButtonText}>Décliner</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => onUpdateStatus(reservation.id, 'accepted')}
                      >
                        <Ionicons name="checkmark-circle" size={18} color={Colors.textLight} />
                        <Text style={styles.acceptButtonText}>Accepter</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {(reservation.status === 'accepted' || reservation.status === 'ACCEPTED' || reservation.status === 'in_progress' || reservation.status === 'IN_PROGRESS') && (
                    <>
                      <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => navigation.navigate('Messages', { conversationId: reservation.id })}
                      >
                        <Ionicons name="chatbubbles-outline" size={18} color={Colors.textLight} />
                        <Text style={styles.contactButtonText}>Contacter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.finishButton}
                        onPress={() => onUpdateStatus(reservation.id, 'completed')}
                      >
                        <Ionicons name="checkmark-done-circle" size={18} color={Colors.textLight} />
                        <Text style={styles.finishButtonText}>Terminer</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('WorkerReservationDetails', { reservation })}
                  >
                    <Ionicons name="eye-outline" size={18} color={Colors.textLight} />
                    <Text style={styles.viewButtonText}>Voir détails</Text>
                  </TouchableOpacity>
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
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  // Header - matches other screens
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textLight,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  scrollView: {
    flex: 1,
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

  // Reservation Card - matches ReservationsPage style
  reservationCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
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
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  clientAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  clientAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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

  // Actions - matches ReservationsPage button style
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
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
  acceptButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  declineButtonText: {
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
  finishButton: {
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
  finishButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textSecondary,
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
});

export default WorkerReservationsPage;
