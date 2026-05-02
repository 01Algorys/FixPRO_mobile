import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import { Colors } from '../styles/theme';

const OrderTracking = ({ route, navigation }) => {
  const { reservationId } = route.params || {};
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reservationId) {
      loadReservationDetails();
    }
  }, [reservationId]);

  const loadReservationDetails = async () => {
    try {
      setLoading(true);
      // Get all reservations and find the specific one
      const response = await apiService.getUserReservations();
      const reservations = response.data?.reservations || response.reservations || response.data || response || [];
      const foundReservation = reservations.find(r => r.id == reservationId);
      setReservation(foundReservation);
    } catch (error) {
      console.error('Failed to load reservation details:', error);
    } finally {
      setLoading(false);
    }
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

  const getStatusTimeline = (status) => {
    const statusLower = status?.toLowerCase() || 'pending';
    const baseTimeline = [
      {
        title: 'Réservation créée',
        time: new Date(reservation?.createdAt || Date.now()).toLocaleDateString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        completed: true
      },
      {
        title: 'En attente de confirmation',
        time: statusLower === 'pending' ? 'En attente' : 'Confirmé',
        completed: statusLower !== 'pending'
      },
      {
        title: 'Accepté par le professionnel',
        time: statusLower === 'accepted' || statusLower === 'in_progress' || statusLower === 'completed' 
          ? 'Accepté' 
          : 'En attente',
        completed: statusLower === 'accepted' || statusLower === 'in_progress' || statusLower === 'completed'
      },
      {
        title: 'En cours de réalisation',
        time: statusLower === 'in_progress' || statusLower === 'completed' ? 'En cours' : 'En attente',
        completed: statusLower === 'in_progress' || statusLower === 'completed'
      },
      {
        title: 'Terminé',
        time: statusLower === 'completed' ? 'Terminé' : 'En attente',
        completed: statusLower === 'completed'
      }
    ];

    // Handle cancelled/rejected status
    if (statusLower === 'cancelled' || statusLower === 'rejected') {
      return [
        baseTimeline[0],
        {
          title: statusLower === 'cancelled' ? 'Annulé' : 'Refusé',
          time: statusLower === 'cancelled' ? 'Annulé' : 'Refusé',
          completed: true
        }
      ];
    }

    return baseTimeline;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails de réservation</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Réservation non trouvée</Text>
          <Text style={styles.errorText}>ID: {reservationId}</Text>
        </View>
      </View>
    );
  }

  const statusConfig = getStatusConfig(reservation.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de réservation</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
            <Text style={styles.reservationId}>ID: {reservation.id}</Text>
          </View>

          {/* Status Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Suivi de la réservation</Text>
            <View style={styles.timeline}>
              {getStatusTimeline(reservation.status).map((step, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineMarker}>
                    <View style={[
                      styles.timelineDot,
                      { backgroundColor: step.completed ? Colors.primary : Colors.border }
                    ]}>
                      {step.completed && (
                        <Ionicons name="checkmark" size={12} color="white" />
                      )}
                    </View>
                    {index < getStatusTimeline(reservation.status).length - 1 && (
                      <View style={[
                        styles.timelineLine,
                        { 
                          backgroundColor: getStatusTimeline(reservation.status)[index + 1].completed 
                            ? Colors.primary 
                            : Colors.border 
                        }
                      ]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineTitle,
                      { color: step.completed ? Colors.text : Colors.textSecondary }
                    ]}>
                      {step.title}
                    </Text>
                    <Text style={[
                      styles.timelineTime,
                      { color: step.completed ? Colors.textSecondary : Colors.textTertiary }
                    ]}>
                      {step.time}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service</Text>
            <Text style={styles.serviceName}>
              {reservation.service?.name || reservation.service || 'Service'}
            </Text>
            {reservation.description && (
              <Text style={styles.description}>{reservation.description}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professionnel</Text>
            <View style={styles.workerRow}>
              <View style={styles.workerAvatar}>
                {reservation.worker?.avatar || reservation.workerAvatar ? (
                  <Image
                    source={{ uri: reservation.worker?.avatar || reservation.workerAvatar }}
                    style={styles.workerAvatarImage}
                  />
                ) : (
                  <Text style={styles.workerAvatarInitial}>
                    {(reservation.workerName || reservation.worker?.name || 'P')?.[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>
                  {reservation.workerName || reservation.worker?.name || 'Professionnel'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date et heure</Text>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {new Date(reservation.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {reservation.address || 'Adresse non spécifiée'}
              </Text>
            </View>
          </View>

          {reservation.workerPhone && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{reservation.workerPhone}</Text>
              </View>
            </View>
          )}
        </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: Colors.textLight,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reservationId: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  timelineSection: {
    marginBottom: 32,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  timelineLine: {
    width: 2,
    height: 32,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  serviceName: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  workerAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  workerAvatarInitial: {
    fontSize: 20,
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
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

export default OrderTracking;
