import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, RefreshControl, Image, StatusBar, AppState,
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
import {
  BLUE, NAVY, PRIMARY, MUTED, STATUS, TRACK_STEP, statusOf, Progress, Stars, SkeletonCard, FilterChips, EmptyList, styles,
} from '../components/reservations/ReservationParts';
import { t } from '../i18n';
import { formatDate, formatPrice } from '../i18n/format';
import { serviceName } from '../i18n/serverText';

const FILTERS = [
  { key: 'all', label: t('status.allPlural') },
  { key: 'pending', label: t('status.pending'), statuses: ['PENDING'] },
  { key: 'active', label: t('status.inProgress'), statuses: ['ACCEPTED', 'IN_PROGRESS'] },
  { key: 'done', label: t('status.completedPlural'), statuses: ['COMPLETED'] },
  { key: 'closed', label: t('status.cancelledPlural'), statuses: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
];

const TRACK = [t('status.sent'), t('status.accepted'), t('status.inProgress'), t('status.completed')];
const ReservationCard = ({ reservation, onOpen, onContact, onRate }) => {
  const status = statusOf(reservation);
  const look = STATUS[status] || STATUS.PENDING;
  const meta = categoryMeta(reservation.service?.category);
  const Icon = meta.lib === 'mci' ? MaterialCommunityIcons : Ionicons;
  const workerName = titleCase(reservation.workerName || t('common.technician'));
  const address = [reservation.location?.address, reservation.location?.city].filter(Boolean).join(', ');
  const price = reservation.actualPrice ?? reservation.estimatedPrice;
  const date = formatDate(reservation.date, { weekday: 'short', day: 'numeric', month: 'short' });
  const canContact = status === 'ACCEPTED' || status === 'IN_PROGRESS';
  const canRate = status === 'COMPLETED' && !reservation.review;

  return (
    <PressableScale style={styles.card} scaleTo={0.985} onPress={onOpen}>
      <View style={styles.cardTop}>
        <LinearGradient colors={meta.gradient || [PRIMARY, NAVY]} style={styles.serviceIcon}>
          <Icon name={meta.icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.service} numberOfLines={1}>{serviceName(reservation.service?.name) || t('common.service')}</Text>
          <Text style={styles.when}>{t('common.dateAtTime', { date, time: reservation.time })}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: look.bg }]}>
          <Ionicons name={look.icon} size={13} color={look.color} />
          <Text style={[styles.badgeText, { color: look.color }]}>{look.label}</Text>
        </View>
      </View>

      {TRACK_STEP[status] !== undefined && <Progress step={TRACK_STEP[status]} labels={TRACK} />}

      <View style={styles.workerRow}>
        {reservation.workerAvatar ? (
          <Image source={{ uri: reservation.workerAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarLetter}>{workerName[0]}</Text>
          </View>
        )}
        <Text style={styles.workerName} numberOfLines={1}>{workerName}</Text>
        {price > 0 && <Text style={styles.price}>{formatPrice(price)}</Text>}
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
          <Text style={styles.reviewLabel}>{t('res.yourReview')}</Text>
        </View>
      )}

      {(canContact || canRate) && (
        <View style={styles.actions}>
          {canContact && (
            <PressableScale style={styles.action} onPress={onContact}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>{t('common.contact')}</Text>
            </PressableScale>
          )}
          {canRate && (
            <PressableScale style={[styles.action, styles.rateAction]} onPress={onRate}>
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.actionText}>{t('res.leaveReview')}</Text>
            </PressableScale>
          )}
        </View>
      )}
    </PressableScale>
  );
};

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
      <EmptyList
        icon={failed ? 'cloud-offline-outline' : 'calendar-outline'}
        title={failed ? t('common.connectionFailed') : t('res.emptyTitle')}
        text={failed ? t('common.pullToRetry') : t('res.emptyText')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <Text style={styles.title}>{t('res.title')}</Text>
        <Text style={styles.subtitle}>
          {activeCount > 0 ? t('res.active', { count: activeCount }) : t('res.followLive')}
        </Text>
      </LinearGradient>

      <FilterChips filters={FILTERS} selected={filter} onSelect={setFilter} countFor={countFor} />

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

export default ReservationsPage;
