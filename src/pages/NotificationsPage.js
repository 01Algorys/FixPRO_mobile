import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useScreenChrome } from '../context/ChromeContext';
import PressableScale from '../components/ui/PressableScale';

const BLUE = '#1a56db';
const NAVY = '#0b3fb3';
const PRIMARY = '#1d5ff0';
const INK = '#0f172a';
const MUTED = '#64748b';
const PAGE = '#f4f7fd';

const STYLES_BY_TYPE = {
  NEW_RESERVATION: { icon: 'notifications', color: PRIMARY, bg: '#e8f0ff' },
  JOB_COMPLETED: { icon: 'star', color: '#f59e0b', bg: '#fff6dc' },
  RESERVATION_CANCELLED: { icon: 'close-circle', color: '#ef4444', bg: '#fee2e2' },
  RESERVATION_EXPIRED: { icon: 'hourglass', color: '#64748b', bg: '#eef1f6' },
  RESERVATION_STATUS: { icon: 'checkmark-circle', color: '#16a34a', bg: '#e3f8f0' },
};
const DEFAULT_STYLE = { icon: 'notifications', color: PRIMARY, bg: '#e8f0ff' };

const timeAgo = (date) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  if (hours < 48) return 'Hier';
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const NotificationRow = ({ item, onPress }) => {
  const look = STYLES_BY_TYPE[item.type] || DEFAULT_STYLE;
  return (
    <PressableScale style={[styles.row, !item.isRead && styles.rowUnread]} scaleTo={0.985} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: look.bg }]}>
        <Ionicons name={look.icon} size={22} color={look.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.rowMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </PressableScale>
  );
};

// Everything that happened on the user's bookings, updated live
const NotificationsPage = ({ navigation }) => {
  useScreenChrome(BLUE, PAGE);
  const { user } = useAuth();
  const { setUnreadNotifications } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiService.getNotifications();
      setNotifications(response.data?.notifications || []);
      setUnreadNotifications(response.data?.unreadCount || 0);
      setFailed(false);
    } catch (error) {
      console.warn('Failed to load notifications:', error.message);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [setUnreadNotifications]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => socketService.onNotification((data) => {
    if (data?.notification?.type !== 'NEW_MESSAGE') load();
  }), [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = (ids) => {
    setNotifications((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n)));
    setUnreadNotifications((count) => (ids ? Math.max(0, count - ids.length) : 0));
    apiService.markNotificationsRead(ids).catch((error) => console.warn('Failed to mark as read:', error.message));
  };

  const open = (item) => {
    if (!item.isRead) markRead([item.id]);
    const { reservationId, workerId, workerName } = item.data || {};
    if (user?.role === 'WORKER') {
      navigation.navigate('WorkerDashboard', { screen: 'Demandes' });
    } else if (item.type === 'JOB_COMPLETED' && workerId) {
      navigation.navigate('Rating', { reservationId, workerId, workerName });
    } else if (reservationId) {
      navigation.navigate('OrderTracking', { reservationId });
    }
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name={failed ? 'cloud-offline-outline' : 'notifications-outline'} size={30} color={PRIMARY} />
        </View>
        <Text style={styles.emptyTitle}>{failed ? 'Connexion impossible' : 'Aucune notification'}</Text>
        <Text style={styles.emptyText}>
          {failed ? 'Tirez vers le bas pour réessayer.' : 'Vous verrez ici les nouvelles de vos réservations.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[BLUE, NAVY]} style={styles.header}>
        <PressableScale style={styles.backBtn} scaleTo={0.9} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Vous êtes à jour'}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.readAll} onPress={() => markRead()}>
            <Ionicons name="checkmark-done" size={17} color="#fff" />
            <Text style={styles.readAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => open(item)} />}
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  readAll: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)' },
  readAllText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  list: { padding: 16, flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1,
  },
  rowUnread: { backgroundColor: '#eef4ff' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15.5, fontWeight: '600', color: INK },
  rowTitleUnread: { fontWeight: '800' },
  rowMessage: { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 2 },
  rowTime: { fontSize: 12.5, color: MUTED, marginTop: 5 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY, marginTop: 5 },

  empty: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 70 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18.5, fontWeight: '800', color: INK, marginTop: 14 },
  emptyText: { fontSize: 14.5, color: MUTED, textAlign: 'center', lineHeight: 21, marginTop: 6 },
});

export default NotificationsPage;
