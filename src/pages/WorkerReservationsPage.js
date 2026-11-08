import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Alert, Image, AppState, StatusBar, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { useNotifications } from '../context/NotificationContext';
import { useScreenChrome } from '../context/ChromeContext';
import { categoryMeta, titleCase } from '../utils/categoryMeta';
import PressableScale from '../components/ui/PressableScale';
import AcceptedModal from '../components/worker/AcceptedModal';
import {
  BLUE, NAVY, PRIMARY, MUTED, STATUS, TRACK_STEP, statusOf, Progress, Stars, SkeletonCard, FilterChips, EmptyList, styles,
} from '../components/reservations/ReservationParts';
import { t } from '../i18n';
import { formatDate, formatPrice } from '../i18n/format';
import { serviceName } from '../i18n/serverText';

const FILTERS = [
  { key: 'all', label: t('status.allPlural') },
  { key: 'pending', label: t('status.newPlural'), statuses: ['PENDING'] },
  { key: 'active', label: t('status.inProgress'), statuses: ['ACCEPTED', 'IN_PROGRESS'] },
  { key: 'done', label: t('status.completedPlural'), statuses: ['COMPLETED'] },
  { key: 'closed', label: t('status.rejectedPlural'), statuses: ['REJECTED', 'EXPIRED'] },
];

const TRACK = [t('status.received'), t('status.accepted'), t('status.inProgress'), t('status.completed')];

const ReservationCard = ({ reservation, onOpen, onAccept, onReject, onContact, onFinish }) => {
  const status = statusOf(reservation);
  const look = STATUS[status] || STATUS.PENDING;
  const meta = categoryMeta(reservation.service?.category);
  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
  const service = serviceName(typeof reservation.service === 'string' ? reservation.service : reservation.service?.name) || t('common.service');
  const clientName = titleCase(reservation.clientName || reservation.user?.name || t('common.client'));
  const clientAvatar = reservation.user?.avatar || reservation.userAvatar;
  const address = [reservation.location?.address, reservation.location?.city].filter(Boolean).join(', ') || reservation.address;
  const price = reservation.actualPrice ?? reservation.estimatedPrice ?? reservation.service?.basePrice;
  const date = reservation.date
    ? formatDate(reservation.date, { weekday: 'short', day: 'numeric', month: 'short' })
    : t('wres.noDate');
  const isPending = status === 'PENDING';
  const isActive = status === 'ACCEPTED' || status === 'IN_PROGRESS';

  return (
    <PressableScale style={styles.card} scaleTo={0.985} onPress={onOpen}>
      <View style={styles.cardTop}>
        <LinearGradient colors={meta.gradient || [PRIMARY, NAVY]} style={styles.serviceIcon}>
          <Icon name={meta.icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.service} numberOfLines={1}>{service}</Text>
          <Text style={styles.when}>{reservation.time ? t('common.dateAtTime', { date, time: reservation.time }) : date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Ionicons name={look.icon} size={13} color={look.color} />
          <Text style={[styles.badgeText, { color: look.color }]}>{look.label}</Text>
        </View>
      </View>

      {TRACK_STEP[status] !== undefined && <Progress step={TRACK_STEP[status]} labels={TRACK} />}

      <View style={styles.workerRow}>
        {clientAvatar ? (
          <Image source={{ uri: clientAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarLetter}>{clientName[0]}</Text>
          </View>
        )}
        <Text style={styles.workerName} numberOfLines={1}>{clientName}</Text>
        {price > 0 && <Text style={styles.price}>{formatPrice(price)}</Text>}
      </View>

      {!!address && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={15} color={MUTED} />
          <Text style={styles.address} numberOfLines={1}>{address}</Text>
        </View>
      )}

      {!!reservation.description && (
        <Text style={local.description} numberOfLines={2}>{reservation.description}</Text>
      )}

      {!!reservation.review && (
        <>
          <View style={styles.review}>
            <Stars rating={Math.floor(reservation.review.rating || 0)} />
            <Text style={styles.reviewLabel}>{t('wres.clientReview')}</Text>
          </View>
          {!!reservation.review.comment && (
            <Text style={local.description} numberOfLines={3}>{reservation.review.comment}</Text>
          )}
        </>
      )}

      {(isPending || isActive) && (
        <View style={styles.actions}>
          {isPending && (
            <>
              <PressableScale style={[styles.action, local.decline]} onPress={onReject}>
                <Ionicons name="close" size={18} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>{t('wres.decline')}</Text>
              </PressableScale>
              <PressableScale style={[styles.action, local.positive]} onPress={onAccept}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.actionText}>{t('common.accept')}</Text>
              </PressableScale>
            </>
          )}
          {isActive && (
            <>
              <PressableScale style={styles.action} onPress={onContact}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={styles.actionText}>{t('common.contact')}</Text>
              </PressableScale>
              <PressableScale style={[styles.action, local.positive]} onPress={onFinish}>
                <Ionicons name="checkmark-done" size={18} color="#fff" />
                <Text style={styles.actionText}>{t('common.finish')}</Text>
              </PressableScale>
            </>
          )}
        </View>
      )}
    </PressableScale>
  );
};

const WorkerReservationsPage = ({ navigation }) => {
  useScreenChrome(BLUE, '#ffffff');
  const { resetReservationUnread } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [acceptedId, setAcceptedId] = useState(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('all');

  // `silent` refreshes in the background (new request, back on the tab)
  // without swapping the list for a spinner
  const loadReservations = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      // Get worker profile first to obtain worker ID
      const workerProfile = await apiService.getWorkerProfile();
      const workerId = workerProfile.data?.userId || workerProfile.id;
      console.log('Worker ID:', workerId);
      
      if (workerId) {
        const response = await apiService.getWorkerReservations(workerId, { limit: 100 });
        console.log(response);
        const list = response.data?.reservations || response.reservations || response.data || response || [];
        setReservations(Array.isArray(list) ? list : []);
        setFailed(false);
      } else {
        console.error('Worker ID not found in profile');
        setReservations([]);
      }
    } catch (error) {
      console.error('Failed to load worker reservations:', error);
      setReservations([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // Real-time: patch the matching reservation in place when the backend
  // emits a status change instead of requiring a manual pull-to-refresh.
  useEffect(() => {
    const unsubscribe = socketService.onReservationUpdate((data) => {
      setReservations((prev) =>
        prev.map((r) =>
          r.id === data.reservationId
            ? {
                ...r,
                status: data.eventType === 'cancelled' ? 'CANCELLED' : (data.newStatus || r.status),
                cancellationReason: data.eventType === 'cancelled' ? data.reason : r.cancellationReason,
              }
            : r
        )
      );
    });
    return unsubscribe;
  }, []);

  // Real-time: a client just sent a request, show it straight away
  useEffect(() => {
    const unsubscribe = socketService.onNewReservation(() => {
      loadReservations({ silent: true });
      // Seen already if this tab is on screen; otherwise keep the tab badge
      if (navigation.isFocused()) resetReservationUnread();
    });
    // Back from the background (e.g. tapping the push): the socket was asleep
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadReservations({ silent: true });
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  // Reset reservation badge when entering this tab, and catch up on requests
  // that came in while the app was in the background
  const isFirstFocus = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      resetReservationUnread();
      if (isFirstFocus.current) isFirstFocus.current = false;
      else loadReservations({ silent: true });
    }, [resetReservationUnread])
  );

  // A request the client cancelled is gone for the technician
  const visibleReservations = reservations.filter((r) => statusOf(r) !== 'CANCELLED');

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations({ silent: true });
    setRefreshing(false);
  };

  const onUpdateStatus = async (reservationId, status) => {
    try {
      await apiService.updateReservationStatus(reservationId, status);
      
      if (status === 'accepted') setAcceptedId(reservationId);
      await loadReservations({ silent: true });
    } catch (error) {
      console.error('Failed to update reservation status:', error);
      Alert.alert(t('common.error'), t('wres.updateFailed'));
    }
  };

  const countFor = (f) => (f.statuses ? visibleReservations.filter((r) => f.statuses.includes(statusOf(r))).length : visibleReservations.length);
  const selected = FILTERS.find((f) => f.key === filter);
  const shown = selected.statuses ? visibleReservations.filter((r) => selected.statuses.includes(statusOf(r))) : visibleReservations;
  const newCount = countFor(FILTERS[1]);

  const renderEmpty = () => {
    if (loading) return <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>;
    return (
      <EmptyList
        icon={failed ? 'cloud-offline-outline' : 'clipboard-outline'}
        title={failed ? t('common.connectionFailed') : t('wres.emptyTitle')}
        text={failed ? t('common.pullToRetry') : t('wres.emptyText')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <Text style={styles.title}>{t('wres.title')}</Text>
        <Text style={styles.subtitle}>
          {newCount > 0 ? t('wres.newCount', { count: newCount }) : t('wres.manageLive')}
        </Text>
      </LinearGradient>

      <FilterChips filters={FILTERS} selected={filter} onSelect={setFilter} countFor={countFor} />

      <FlatList
        style={{ flex: 1 }}
        data={shown}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => (
          <ReservationCard
            reservation={item}
            onOpen={() => navigation.navigate('WorkerReservationDetails', { reservation: item })}
            onAccept={() => onUpdateStatus(item.id, 'accepted')}
            onReject={() => onUpdateStatus(item.id, 'rejected')}
            onContact={() => navigation.navigate('Messages', { conversationId: item.id })}
            onFinish={() => onUpdateStatus(item.id, 'completed')}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      />

      <AcceptedModal
        visible={!!acceptedId}
        onClose={() => setAcceptedId(null)}
        onContact={() => {
          navigation.navigate('Messages', { conversationId: acceptedId });
          setAcceptedId(null);
        }}
        onViewJobs={() => {
          navigation.navigate('Dashboard');
          setAcceptedId(null);
        }}
      />
    </View>
  );
};

const local = StyleSheet.create({
  description: { fontSize: 13.5, lineHeight: 19, color: '#334155', marginTop: 10 },
  decline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fca5a5' },
  positive: { backgroundColor: '#16a34a' },
});

export default WorkerReservationsPage;
