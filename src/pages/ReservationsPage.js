import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, RefreshControl, Image, StatusBar, AppState,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { useNotifications } from '../context/NotificationContext';
import { useScreenChrome } from '../context/ChromeContext';
import { categoryMeta, titleCase } from '../utils/categoryMeta';
import PressableScale from '../components/ui/PressableScale';

const BLUE = '#1a56db';
const NAVY = '#0b3fb3';
const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const PAGE = '#f4f7fd';

const STATUS = {
  PENDING: { label: 'En attente', color: '#b45309', bg: '#fef3c7', icon: 'time' },
  ACCEPTED: { label: 'Acceptée', color: PRIMARY, bg: '#e8f0ff', icon: 'checkmark-circle' },
  IN_PROGRESS: { label: 'En cours', color: '#7c3aed', bg: '#ede9fe', icon: 'construct' },
  COMPLETED: { label: 'Terminée', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-done-circle' },
  CANCELLED: { label: 'Annulée', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  REJECTED: { label: 'Refusée', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  EXPIRED: { label: 'Expirée', color: '#475569', bg: '#eef1f6', icon: 'hourglass' },
};

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente', statuses: ['PENDING'] },
  { key: 'active', label: 'En cours', statuses: ['ACCEPTED', 'IN_PROGRESS'] },
  { key: 'done', label: 'Terminées', statuses: ['COMPLETED'] },
  { key: 'closed', label: 'Annulées', statuses: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
];

const TRACK = ['Envoyée', 'Acceptée', 'En cours', 'Terminée'];
const TRACK_STEP = { PENDING: 0, ACCEPTED: 1, IN_PROGRESS: 2 };

const statusOf = (reservation) => String(reservation.status || 'PENDING').toUpperCase();

// Where the booking stands, shown while it is in progress
const Progress = ({ step }) => (
  <View style={styles.track}>
    {TRACK.map((label, i) => (
      <View key={label} style={styles.trackStep}>
        <View style={styles.trackLineRow}>
          <View style={[styles.trackLine, i === 0 && styles.trackLineHidden, i <= step && styles.trackLineOn]} />
          <View style={[styles.trackDot, i <= step && styles.trackDotOn]}>
            {i <= step && <Ionicons name="checkmark" size={11} color="#fff" />}
          </View>
          <View style={[styles.trackLine, i === TRACK.length - 1 && styles.trackLineHidden, i < step && styles.trackLineOn]} />
        </View>
        <Text style={[styles.trackLabel, i === step && styles.trackLabelOn]} numberOfLines={1}>{label}</Text>
      </View>
    ))}
  </View>
);

const Stars = ({ rating }) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Ionicons key={n} name={n <= rating ? 'star' : 'star-outline'} size={14} color="#f5b400" />
    ))}
  </View>
);

const ReservationCard = ({ reservation, onOpen, onContact, onRate }) => {
  const status = statusOf(reservation);
  const look = STATUS[status] || STATUS.PENDING;
  const meta = categoryMeta(reservation.service?.category);
  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
  const workerName = titleCase(reservation.workerName || 'Technicien');
  const address = [reservation.location?.address, reservation.location?.city].filter(Boolean).join(', ');
  const price = reservation.actualPrice ?? reservation.estimatedPrice;
  const date = new Date(reservation.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const canContact = status === 'ACCEPTED' || status === 'IN_PROGRESS';
  const canRate = status === 'COMPLETED' && !reservation.review;

  return (
    <PressableScale style={styles.card} scaleTo={0.985} onPress={onOpen}>
      <View style={styles.cardTop}>
        <LinearGradient colors={meta.gradient || [PRIMARY, NAVY]} style={styles.serviceIcon}>
          <Icon name={meta.icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.service} numberOfLines={1}>{reservation.service?.name || 'Service'}</Text>
          <Text style={styles.when}>{date} à {reservation.time}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Ionicons name={look.icon} size={13} color={look.color} />
          <Text style={[styles.badgeText, { color: look.color }]}>{look.label}</Text>
        </View>
      </View>

      {TRACK_STEP[status] !== undefined && <Progress step={TRACK_STEP[status]} />}

      <View style={styles.workerRow}>
        {reservation.workerAvatar ? (
          <Image source={{ uri: reservation.workerAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarLetter}>{workerName[0]}</Text>
          </View>
        )}
        <Text style={styles.workerName} numberOfLines={1}>{workerName}</Text>
        {price > 0 && <Text style={styles.price}>{price} TND</Text>}
      </View>

      {!!address && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={15} color={MUTED} />
          <Text style={styles.address} numberOfLines={1}>{address}</Text>
        </View>
      )}

      {!!reservation.review && (
        <View style={styles.review}>
          <Stars rating={reservation.review.rating} />
          <Text style={styles.reviewLabel}>Votre avis</Text>
        </View>
      )}

      {(canContact || canRate) && (
        <View style={styles.actions}>
          {canContact && (
            <PressableScale style={styles.action} onPress={onContact}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Contacter</Text>
            </PressableScale>
          )}
          {canRate && (
            <PressableScale style={[styles.action, styles.rateAction]} onPress={onRate}>
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.actionText}>Donner mon avis</Text>
            </PressableScale>
          )}
        </View>
      )}
    </PressableScale>
  );
};

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardTop}>
      <View style={[styles.serviceIcon, styles.skeleton]} />
      <View style={{ flex: 1 }}>
        <View style={[styles.skeletonLine, { width: '65%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
  </View>
);

const ReservationsPage = ({ navigation }) => {
  useScreenChrome(BLUE, '#ffffff');
  const { resetReservationUnread } = useNotifications();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await apiService.getUserReservations();
      const list = data.data?.reservations || [];
      setReservations(Array.isArray(list) ? list : []);
      setFailed(false);
    } catch (error) {
      console.warn('Failed to load reservations:', error.message);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live: show the new status straight away, then refresh the rest (price,
  // review...). Also catches up after the app was in the background.
  useEffect(() => {
    const unsubscribe = socketService.onReservationUpdate((data) => {
      const next = data.eventType === 'cancelled' ? 'CANCELLED' : data.newStatus;
      if (next) {
        setReservations((prev) => prev.map((r) => (r.id === data.reservationId ? { ...r, status: next } : r)));
      }
      load();
      if (navigation.isFocused()) resetReservationUnread();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [load]);

  // Also picks up a booking just made elsewhere in the app
  useFocusEffect(
    useCallback(() => {
      load();
      resetReservationUnread();
    }, [load, resetReservationUnread])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const countFor = (f) => (f.statuses ? reservations.filter((r) => f.statuses.includes(statusOf(r))).length : reservations.length);
  const selected = FILTERS.find((f) => f.key === filter);
  const visible = selected.statuses ? reservations.filter((r) => selected.statuses.includes(statusOf(r))) : reservations;
  const activeCount = countFor(FILTERS[2]);

  const renderEmpty = () => {
    if (loading) return <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name={failed ? 'cloud-offline-outline' : 'calendar-outline'} size={30} color={PRIMARY} />
        </View>
        <Text style={styles.emptyTitle}>{failed ? 'Connexion impossible' : 'Aucune réservation ici'}</Text>
        <Text style={styles.emptyText}>
          {failed ? 'Tirez vers le bas pour réessayer.' : 'Vos réservations apparaîtront ici dès votre première demande.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <Text style={styles.title}>Mes réservations</Text>
        <Text style={styles.subtitle}>
          {activeCount > 0 ? `${activeCount} intervention${activeCount > 1 ? 's' : ''} en cours` : 'Suivez vos demandes en direct'}
        </Text>
      </LinearGradient>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <PressableScale key={f.key} style={[styles.chip, active && styles.chipActive]} scaleTo={0.95} onPress={() => setFilter(f.key)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                <View style={[styles.chipCount, active && styles.chipCountActive]}>
                  <Text style={[styles.chipCountText, active && styles.chipTextActive]}>{countFor(f)}</Text>
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => (
          <ReservationCard
            reservation={item}
            onOpen={() => navigation.navigate('OrderTracking', { reservationId: item.id })}
            onContact={() => navigation.navigate('Messages', { conversationId: item.id })}
            onRate={() => navigation.navigate('Rating', {
              reservationId: item.id,
              workerId: item.workerId,
              workerName: item.workerName || 'technicien',
            })}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { fontSize: 25, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingLeft: 14, paddingRight: 8,
    borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#fff' },
  chipCount: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#eef1f6', alignItems: 'center', justifyContent: 'center' },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  chipCountText: { fontSize: 12, fontWeight: '700', color: '#475569' },

  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  service: { fontSize: 16, fontWeight: '800', color: INK },
  when: { fontSize: 13.5, color: MUTED, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  track: { flexDirection: 'row', marginTop: 14 },
  trackStep: { flex: 1, alignItems: 'center' },
  trackLineRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  trackLine: { flex: 1, height: 3, backgroundColor: '#e2e8f0' },
  trackLineOn: { backgroundColor: PRIMARY },
  trackLineHidden: { backgroundColor: 'transparent' },
  trackDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  trackDotOn: { backgroundColor: PRIMARY },
  trackLabel: { fontSize: 11.5, color: MUTED, marginTop: 5 },
  trackLabelOn: { color: PRIMARY, fontWeight: '700' },

  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e8f0ff' },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  workerName: { flex: 1, fontSize: 14.5, fontWeight: '600', color: INK },
  price: { fontSize: 15.5, fontWeight: '800', color: INK },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  address: { flex: 1, fontSize: 13.5, color: MUTED },
  review: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  reviewLabel: { fontSize: 13, color: MUTED },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  rateAction: { backgroundColor: '#f59e0b' },
  actionText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },

  skeleton: { backgroundColor: '#edf1f8' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#edf1f8' },

  empty: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 50 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18.5, fontWeight: '800', color: INK, marginTop: 14 },
  emptyText: { fontSize: 14.5, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 6 },
});

export default ReservationsPage;
