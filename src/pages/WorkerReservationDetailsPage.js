import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Image, Linking, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { categoryMeta } from '../utils/categoryMeta';
import PressableScale from '../components/ui/PressableScale';
import FadeIn from '../components/ui/FadeIn';

const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const SURFACE = '#f4f7fc';

const STATUS = {
  PENDING: { label: 'Nouvelle demande', color: '#b45309', bg: '#fef3c7', icon: 'time' },
  ACCEPTED: { label: 'Confirmée', color: '#15803d', bg: '#dcfce7', icon: 'checkmark-circle' },
  IN_PROGRESS: { label: 'En cours', color: PRIMARY, bg: '#dbeafe', icon: 'construct' },
  COMPLETED: { label: 'Terminée', color: '#7c3aed', bg: '#ede9fe', icon: 'checkmark-done-circle' },
  CANCELLED: { label: 'Annulée', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  REJECTED: { label: 'Refusée', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  EXPIRED: { label: 'Expirée', color: MUTED, bg: '#f1f5f9', icon: 'hourglass' },
};

const upper = (s) => String(s || '').toUpperCase();

const longDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—';

const Row = ({ icon, label, value, last }) => (
  <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={17} color={PRIMARY} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

const WorkerReservationDetailsPage = ({ route, navigation }) => {
  const [reservation, setReservation] = useState(route.params?.reservation || null);
  const [busy, setBusy] = useState(null);

  // Refresh from the API so the screen has the latest status and client details
  useEffect(() => {
    if (!reservation?.id) return;
    apiService.getReservation(reservation.id)
      .then((res) => {
        const fresh = res?.data?.reservation || res?.data;
        if (fresh?.id) setReservation((prev) => ({ ...prev, ...fresh, user: fresh.user || prev.user, service: fresh.service || prev.service }));
      })
      .catch(() => {});
  }, []);

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

  const status = upper(reservation.status);
  const statusMeta = STATUS[status] || STATUS.PENDING;
  const meta = categoryMeta(reservation.service?.category, { name: reservation.service?.name });
  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
  const client = reservation.user || {};
  const clientName = reservation.clientName || client.name || 'Client';
  const loc = reservation.location || {};
  const address = [loc.address || reservation.address, loc.city].filter(Boolean).join(', ') || 'Adresse non précisée';
  const price = reservation.actualPrice ?? reservation.estimatedPrice ?? reservation.service?.basePrice;
  const images = Array.isArray(reservation.images) ? reservation.images : [];

  const updateStatus = async (next) => {
    try {
      setBusy(next);
      await apiService.updateReservationStatus(reservation.id, next);
      if (next === 'accepted') {
        navigation.navigate('WorkerDashboard', { screen: 'Messages', params: { conversationId: reservation.id } });
      } else if (next === 'rejected') {
        navigation.goBack();
      } else {
        setReservation((prev) => ({ ...prev, status: upper(next) }));
      }
    } catch (error) {
      console.error('Failed to update reservation from details:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la demande.');
    } finally {
      setBusy(null);
    }
  };

  const confirm = (title, message, action, next, destructive) =>
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: action, style: destructive ? 'destructive' : 'default', onPress: () => updateStatus(next) },
    ]);

  const call = () => client.phone && Linking.openURL(`tel:${client.phone}`);
  const message = () =>
    navigation.navigate('WorkerDashboard', { screen: 'Messages', params: { conversationId: reservation.id } });
  const openMaps = () => {
    const lat = loc.latitude ?? loc.lat;
    const lng = loc.longitude ?? loc.lng;
    const q = encodeURIComponent(address);
    const url = typeof lat === 'number' && typeof lng === 'number'
      ? Platform.select({ ios: `http://maps.apple.com/?daddr=${lat},${lng}`, default: `geo:${lat},${lng}?q=${lat},${lng}` })
      : Platform.select({ ios: `http://maps.apple.com/?daddr=${q}`, default: `geo:0,0?q=${q}` });
    Linking.openURL(url).catch(() => {});
  };

  const canContact = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </PressableScale>
        <Text style={styles.headerTitle}>Détail de la demande</Text>
        <Text style={styles.ref}>#{String(reservation.id).padStart(4, '0')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <FadeIn style={[styles.card, styles.hero]}>
          <View style={styles.heroTop}>
            <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
              <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
              <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
            {reservation.emergency && (
              <View style={styles.urgentPill}>
                <Ionicons name="flash" size={13} color="#fff" />
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>
          <View style={styles.heroBody}>
            <View style={styles.categoryTile}>
              <Icon name={meta.icon} size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{meta.label}</Text>
              {!!reservation.service?.name && reservation.service.name !== meta.label && (
                <Text style={styles.heroSub} numberOfLines={2}>{reservation.service.name}</Text>
              )}
            </View>
            {price != null && (
              <View style={styles.pricePill}>
                <Text style={styles.priceText}>{price} TND</Text>
              </View>
            )}
          </View>
        </FadeIn>

        {/* Client */}
        <FadeIn delay={50}>
          <Text style={styles.sectionLabel}>Client</Text>
          <View style={[styles.card, styles.clientCard]}>
            {client.avatar ? (
              <Image source={{ uri: client.avatar }} style={styles.clientAvatar} />
            ) : (
              <View style={[styles.clientAvatar, styles.clientAvatarFallback]}>
                <Text style={styles.clientInitial}>{clientName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.clientSub}>
                {canContact && client.phone ? client.phone : 'Coordonnées visibles après acceptation'}
              </Text>
            </View>
            {canContact && (
              <View style={styles.contactBtns}>
                {!!client.phone && (
                  <PressableScale style={styles.roundBtn} scaleTo={0.9} onPress={call}>
                    <Ionicons name="call" size={19} color={PRIMARY} />
                  </PressableScale>
                )}
                <PressableScale style={styles.roundBtn} scaleTo={0.9} onPress={message}>
                  <Ionicons name="chatbubble-ellipses" size={19} color={PRIMARY} />
                </PressableScale>
              </View>
            )}
          </View>
        </FadeIn>

        {/* Schedule & place */}
        <FadeIn delay={100}>
          <Text style={styles.sectionLabel}>Rendez-vous</Text>
          <View style={styles.card}>
            <Row icon="calendar-outline" label="Date" value={longDate(reservation.date)} />
            <Row icon="time-outline" label="Heure" value={`${reservation.time || '—'}${reservation.duration ? ` · ${reservation.duration} min` : ''}`} />
            <Row icon="location-outline" label="Adresse" value={address} last />
            <PressableScale style={styles.mapsBtn} onPress={openMaps}>
              <Ionicons name="navigate" size={16} color={PRIMARY} />
              <Text style={styles.mapsText}>Itinéraire</Text>
            </PressableScale>
          </View>
        </FadeIn>

        {/* Description */}
        <FadeIn delay={150}>
          <Text style={styles.sectionLabel}>Description</Text>
          <View style={[styles.card, styles.pad]}>
            <Text style={styles.description}>{reservation.description || 'Aucune description.'}</Text>
            {images.length > 0 && (
              <View style={styles.photos}>
                {images.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.photo} />
                ))}
              </View>
            )}
          </View>
        </FadeIn>

        {!!reservation.cancellationReason && (
          <FadeIn delay={180}>
            <View style={[styles.card, styles.pad, styles.cancelBox]}>
              <Text style={styles.cancelTitle}>Motif d'annulation</Text>
              <Text style={styles.cancelText}>{reservation.cancellationReason}</Text>
            </View>
          </FadeIn>
        )}
      </ScrollView>

      {/* Actions */}
      {status === 'PENDING' && (
        <View style={styles.actions}>
          <PressableScale
            style={[styles.actionBtn, styles.rejectBtn]}
            disabled={!!busy}
            onPress={() => confirm('Refuser la demande', 'Le client sera informé que vous ne pouvez pas intervenir.', 'Refuser', 'rejected', true)}
          >
            <Ionicons name="close" size={20} color="#dc2626" />
            <Text style={styles.rejectText}>Refuser</Text>
          </PressableScale>
          <PressableScale style={[styles.actionBtn, styles.primaryBtn]} disabled={!!busy} onPress={() => updateStatus('accepted')}>
            {busy === 'accepted' ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.primaryText}>Accepter</Text>
              </>
            )}
          </PressableScale>
        </View>
      )}
      {status === 'ACCEPTED' && (
        <View style={styles.actions}>
          <PressableScale
            style={[styles.actionBtn, styles.primaryBtn]}
            disabled={!!busy}
            onPress={() => confirm("Commencer l'intervention", 'Le client verra que vous êtes sur place.', 'Commencer', 'in_progress')}
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.primaryText}>Commencer l'intervention</Text>
              </>
            )}
          </PressableScale>
        </View>
      )}
      {status === 'IN_PROGRESS' && (
        <View style={styles.actions}>
          <PressableScale
            style={[styles.actionBtn, styles.doneBtn]}
            disabled={!!busy}
            onPress={() => confirm("Terminer l'intervention", 'Le client pourra ensuite laisser un avis.', 'Terminer', 'completed')}
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.primaryText}>Terminer l'intervention</Text>
              </>
            )}
          </PressableScale>
        </View>
      )}
    </View>
  );
};

const shadow = {
  shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eef2f7',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: INK },
  ref: { fontSize: 13, fontWeight: '600', color: MUTED, marginRight: 10 },

  content: { padding: 16, paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 20, ...shadow },
  pad: { padding: 16 },
  sectionLabel: {
    fontSize: 12.5, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 22, marginBottom: 8, marginLeft: 4,
  },

  hero: { padding: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  urgentPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef4444', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  urgentText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryTile: { width: 56, height: 56, borderRadius: 17, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 19, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  heroSub: { fontSize: 14, color: '#475569', marginTop: 2 },
  pricePill: { backgroundColor: '#e3edff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  priceText: { fontSize: 16, fontWeight: '800', color: INK },

  clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  clientAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e3edff' },
  clientAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  clientInitial: { fontSize: 20, fontWeight: '700', color: PRIMARY },
  clientName: { fontSize: 16, fontWeight: '700', color: INK },
  clientSub: { fontSize: 13, color: MUTED, marginTop: 2 },
  contactBtns: { flexDirection: 'row', gap: 8 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  rowValue: { fontSize: 15, color: INK, fontWeight: '600', marginTop: 1, textTransform: 'none' },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    margin: 12, marginTop: 4, height: 44, borderRadius: 22, backgroundColor: '#eef4ff',
  },
  mapsText: { color: PRIMARY, fontSize: 14.5, fontWeight: '700' },

  description: { fontSize: 15, lineHeight: 22, color: '#334155' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photo: { width: 92, height: 92, borderRadius: 14, backgroundColor: '#e2e8f0' },
  cancelBox: { marginTop: 14, backgroundColor: '#fef2f2' },
  cancelTitle: { fontSize: 13, fontWeight: '700', color: '#b91c1c', marginBottom: 4 },
  cancelText: { fontSize: 14, color: '#7f1d1d' },

  actions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eef2f7',
  },
  actionBtn: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rejectBtn: { borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff' },
  rejectText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
  primaryBtn: { backgroundColor: PRIMARY },
  doneBtn: { backgroundColor: '#16a34a' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE },
  emptyText: { color: MUTED },
});

export default WorkerReservationDetailsPage;
