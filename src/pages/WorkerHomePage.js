import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { Colors } from '../styles/theme';

const { width } = Dimensions.get('window');
const THEME = Colors.primary; // use the exact dark blue from the current theme

export default function WorkerHomePage({ navigation }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [newRequests, setNewRequests] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    try {
      setError(null);
      
      // Fetch profile and reservations in parallel
      const [profileData, reservationsData] = await Promise.all([
        apiService.getWorkerProfile(),
        apiService.getWorkerReservations(user.id),
      ]);

      // Extract profile data
      const profileResponse = profileData.data || profileData;
      setProfile(profileResponse);

      // Extract reservations data
      const reservationsList = reservationsData.data?.reservations || reservationsData.reservations || reservationsData.data || reservationsData || [];
      const reservationsArray = Array.isArray(reservationsList) ? reservationsList : [];

      // Derive stats from profile and reservations
      const derivedStats = {
        credits: profileResponse?.credits || 0,
        totalMissions: reservationsArray.length,
      };
      setStats(derivedStats);

      // Filter new/pending requests
      const pendingRequests = reservationsArray.filter(
        (r) => r.status === 'pending' || r.status === 'PENDING'
      );
      setNewRequests(pendingRequests);

      // Filter upcoming interventions (accepted, in_progress, confirmed)
      const upcomingInterventions = reservationsArray.filter(
        (r) => ['accepted', 'in_progress', 'confirmed', 'CONFIRMED'].includes(r.status)
      );
      setInterventions(upcomingInterventions);

    } catch (err) {
      console.error('[Dashboard] fetchAll error:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />
        }
      >
        {/* ── HEADER ── */}
        <LinearGradient
          colors={[THEME, '#2a4a8e']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>FixPro</Text>
              <Text style={styles.greeting}>
                Bonjour, {profile?.firstName || user?.name?.split(' ')[0] || 'Professionnel'} {profile?.lastName || user?.name?.split(' ')[1] || ''} 👋
              </Text>
              <Text style={styles.tagline}>Simple · rapide · fiable</Text>
            </View>

            {/* Avatar — hardcoded placeholder, no API image */}
            <TouchableOpacity onPress={() => navigation.navigate('Profil')}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(profile?.firstName || user?.name || 'W')?.[0]?.toUpperCase() ?? 'W'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Online status badge */}
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>En ligne · Disponible</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── STATS GRID ── */}
          <View style={styles.statsGrid}>

            {/* Credits — wide blue card */}
            <LinearGradient
              colors={['#2563eb', '#1d4ed8']}
              style={[styles.statCard, styles.statCardWide]}
            >
              <Ionicons name="wallet-outline" size={28} color="#fff" />
              <Text style={styles.statLabelLight}>Crédits</Text>
              <Text style={styles.statValueLight}>{stats?.totalMissions * 2 ?? 0} TND</Text>
            </LinearGradient>

            {/* Missions */}
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={28} color={THEME} />
              <Text style={styles.statLabel}>Missions</Text>
              <Text style={styles.statValue}>{stats?.totalMissions ?? 0}</Text>
            </View>

            {/* Rating */}
            <View style={styles.statCard}>
              <FontAwesome5 name="star" size={24} color="#f59e0b" solid />
              <Text style={styles.statLabel}>Note</Text>
              <Text style={styles.statValue}>
                {profile?.rating ? profile.rating.toFixed(1) : '—'}
              </Text>
            </View>

            {/* Price range */}
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="tag-outline" size={28} color="#f59e0b" />
              <Text style={styles.statLabel}>Prix</Text>
              <Text style={[styles.statValue, { fontSize: 13 }]}>
                {profile?.priceMin ?? '—'} - {profile?.priceMax ?? '—'} TND
              </Text>
            </View>

          </View>

          {/* ── NEW REQUESTS ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nouvelles demandes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Demandes')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {newRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Aucune nouvelle demande</Text>
                <Text style={styles.emptySubtitle}>
                  Vous serez notifié ici des nouvelles réservations
                </Text>
              </View>
            ) : (
              newRequests.slice(0, 3).map((req) => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.requestCard}
                  onPress={() => navigation.navigate('WorkerReservationDetails', { reservation: req })}
                >
                  <View style={styles.requestLeft}>
                    <View style={styles.requestIconBox}>
                      <Ionicons name="construct-outline" size={22} color={THEME} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestName}>{req.clientName || req.user?.name || 'Client'}</Text>
                      <Text style={styles.requestDate}>
                        {req.date || new Date(req.createdAt).toLocaleDateString('fr-FR')} · {req.address || req.location?.address || 'Adresse'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestBadge}>
                    <Text style={styles.requestBadgeText}>Nouveau</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* ── INTERVENTIONS ── */}
          <View style={[styles.section, { marginBottom: 32 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes interventions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Demandes')}>
                <Ionicons name="chevron-forward" size={20} color={THEME} />
              </TouchableOpacity>
            </View>

            {interventions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="briefcase-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Aucune intervention</Text>
                <Text style={styles.emptySubtitle}>
                  Vos interventions à venir apparaîtront ici
                </Text>
              </View>
            ) : (
              interventions.slice(0, 3).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.interventionCard}
                  onPress={() => navigation.navigate('WorkerReservationDetails', { reservation: item })}
                >
                  <View style={styles.interventionLeft}>
                    <View style={[styles.interventionDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.interventionName}>{item.clientName || item.user?.name || 'Client'}</Text>
                      <Text style={styles.interventionDate}>
                        {item.date || new Date(item.createdAt).toLocaleDateString('fr-FR')} à {item.time || '--:--'}
                      </Text>
                      <Text style={styles.interventionAddress}>{item.address || item.location?.address || 'Adresse'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ─── HELPERS ───
const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
    case 'CONFIRMED':
    case 'accepted':
      return '#10b981';
    case 'pending':
    case 'PENDING':
      return '#f59e0b';
    case 'cancelled':
    case 'CANCELLED':
      return '#ef4444';
    case 'in_progress':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'confirmed':
    case 'CONFIRMED':
    case 'accepted':
      return 'Confirmé';
    case 'pending':
    case 'PENDING':
      return 'En attente';
    case 'cancelled':
    case 'CANCELLED':
      return 'Annulé';
    case 'in_progress':
      return 'En cours';
    default:
      return status;
  }
};

// ─── STYLES ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  errorText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#1a2f5e', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 24, marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Header
  header: { paddingTop: 52, paddingBottom: 28, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  greeting: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 4 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Avatar — hardcoded placeholder only
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },

  // Status badge
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start', paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 20, marginTop: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Body
  body: { padding: 16, gap: 20 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: (width - 44) / 2,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardWide: { width: (width - 44) / 2 },
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  statLabelLight: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1a2f5e' },
  statValueLight: { fontSize: 22, fontWeight: '800', color: '#fff' },

  // Sections
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a2f5e' },
  seeAll: { fontSize: 14, color: '#2563eb', fontWeight: '600' },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  // Request cards
  requestCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  requestIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center',
  },
  requestName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  requestDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  requestBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  requestBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },

  // Intervention cards
  interventionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  interventionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  interventionDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  interventionName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  interventionDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  interventionAddress: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});
