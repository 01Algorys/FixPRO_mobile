import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { Colors } from '../styles/theme';

const WorkerReservationDetailsPage = ({ route, navigation }) => {
  const [reservation, setReservation] = useState(route.params?.reservation || null);

  // Real-time: join this reservation's room and reflect status changes live.
  useEffect(() => {
    if (!reservation?.id) return;

    socketService.joinReservation(reservation.id);
    const unsubscribe = socketService.onReservationUpdate((data) => {
      if (data.reservationId !== reservation.id) return;
      setReservation((prev) => ({
        ...prev,
        status: data.eventType === 'cancelled' ? 'CANCELLED' : (data.newStatus || prev.status),
      }));
    });

    return () => {
      socketService.leaveReservation(reservation.id);
      unsubscribe();
    };
  }, [reservation?.id]);

  if (!reservation) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Réservation introuvable.</Text>
      </View>
    );
  }

  const updateStatus = async (status) => {
    try {
      await apiService.updateReservationStatus(reservation.id, status);

      // If accepting reservation, navigate to messages
      if (status === 'accepted') {
        navigation.navigate('Messages', {
          conversationId: reservation.id
        });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to update reservation from details:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour le statut de la réservation.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails réservation</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{reservation.service?.name || reservation.service || 'Service'}</Text>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.value}>{reservation.clientName || reservation.user?.name || 'Client'}</Text>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{reservation.date ? new Date(reservation.date).toLocaleDateString('fr-FR') : '-'}</Text>
          <Text style={styles.label}>Heure</Text>
          <Text style={styles.value}>{reservation.time || '-'}</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{reservation.description || 'Aucune description'}</Text>
          <Text style={styles.label}>Adresse</Text>
          <Text style={styles.value}>{reservation.location?.address || reservation.address || 'Non spécifiée'}</Text>
          <Text style={styles.label}>Statut</Text>
          <Text style={styles.value}>{reservation.status || 'pending'}</Text>
        </View>
      </ScrollView>
      {(reservation.status === 'pending' || reservation.status === 'PENDING') && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.decline} onPress={() => updateStatus('rejected')}>
            <Text style={styles.actionText}>Décliner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accept} onPress={() => updateStatus('accepted')}>
            <Text style={styles.actionText}>Accepter</Text>
          </TouchableOpacity>
        </View>
      )}

      {(reservation.status === 'accepted' || reservation.status === 'ACCEPTED' || reservation.status === 'in_progress' || reservation.status === 'IN_PROGRESS') && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.finish} onPress={() => updateStatus('completed')}>
            <Text style={styles.actionText}>Terminer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { color: Colors.textLight, fontSize: 20, fontWeight: '700' },
  content: { flex: 1, padding: 14 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14 },
  label: { marginTop: 10, color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  value: { color: Colors.text, marginTop: 4, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: Colors.border },
  decline: { flex: 1, backgroundColor: Colors.error, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  accept: { flex: 1, backgroundColor: Colors.success, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  finish: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionText: { color: Colors.textLight, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  emptyText: { color: Colors.textSecondary },
});

export default WorkerReservationDetailsPage;
